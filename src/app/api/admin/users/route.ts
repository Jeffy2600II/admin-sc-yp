import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-guard";
import { synthesizeStudentEmail } from "@/lib/utils/format";
import { filterPayload } from "@/lib/db/schema-detect";

/**
 * POST /api/admin/users
 * Body: { fullName, studentId?, nationalId?, email?, year, accountType, departmentId?, color? }
 *
 * Creates a new council_users row + Supabase Auth account.
 * Uses service-role client because RLS blocks authenticated users from
 * INSERTing into council_users.
 */
export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const {
    fullName,
    studentId,
    nationalId,
    email,
    year,
    accountType,
    departmentId,
    // v1.7: color removed — council_users has no color column (schema_sc.md)
    role,
    avatarUrl,
  } = body;

  if (!fullName || typeof fullName !== "string") {
    return NextResponse.json(
      { success: false, error: "Missing fullName" },
      { status: 400 }
    );
  }
  if (!year || typeof year !== "number") {
    return NextResponse.json(
      { success: false, error: "Missing year" },
      { status: 400 }
    );
  }

  const guard = await requireAdmin();
  if (!guard.ok) {
    return NextResponse.json(
      { success: false, error: "ไม่ได้รับอนุญาต" },
      { status: guard.response.status }
    );
  }

  try {
    const acctType: string = accountType || "student";
    let authEmail: string;
    let authPassword: string;

    // v1.6: accept an explicit password from the request body (admin-set).
    // Fall back to legacy patterns if not provided.
    const bodyPassword: string | undefined = body.password;

    if (acctType === "student" && studentId) {
      authEmail = synthesizeStudentEmail(studentId);
      authPassword = bodyPassword || studentId;
    } else {
      authEmail = email || `${fullName.replace(/\s+/g, ".").toLowerCase()}@yplabs.internal`;
      authPassword = bodyPassword || "123456";
    }

    // Guard: password must be at least 6 chars (Supabase Auth minimum)
    if (authPassword.length < 6) {
      authPassword = authPassword.padEnd(6, "0");
    }

    // 1. Create Supabase Auth user
    //
    // v1.9.2: If the synthesized email already exists (e.g., student was
    // previously approved then deleted from council_users but the auth
    // account remained), createUser will fail with "already registered".
    // We try to recover by reusing the existing auth account.
    const {
      data: authUser,
      error: authError,
    } = await guard.adminClient.auth.admin.createUser({
      email: authEmail,
      password: authPassword,
      email_confirm: true,
      // v1.9.3: NO user_metadata — old admin system didn't set display name.
      // Setting it causes login to fail because data doesn't match old accounts.
    });

    let finalAuthUid: string;

    if (authError || !authUser.user) {
      const errMsg = authError?.message || "";
      // v1.9.2: Check if the error is "already registered"
      if (errMsg.includes("already been registered") || errMsg.includes("already registered")) {
        // Look up the existing auth user by email
        const { data: existingUsers, error: listError } =
          await guard.adminClient.auth.admin.listUsers();

        if (listError) {
          console.error("[/api/admin/users] listUsers error:", listError);
          return NextResponse.json(
            {
              success: false,
              error: `ไม่สามารถสร้างบัญชี Auth ได้: ${errMsg}`,
            },
            { status: 400 }
          );
        }

        const existingUser = (existingUsers.users || []).find(
          (u) => u.email === authEmail
        );

        if (!existingUser) {
          return NextResponse.json(
            {
              success: false,
              error: `ไม่สามารถสร้างบัญชี Auth ได้: ${errMsg}`,
            },
            { status: 400 }
          );
        }

        // Check if the existing auth user already has a council_users row
        const { data: existingCouncilUser } = await guard.adminClient
          .from("council_users")
          .select("id, full_name")
          .eq("auth_uid", existingUser.id)
          .maybeSingle();

        if (existingCouncilUser) {
          return NextResponse.json(
            {
              success: false,
              error: `บัญชีนี้ถูกสร้างไปแล้วสำหรับ "${existingCouncilUser.full_name}" — ไม่สามารถสร้างซ้ำได้`,
            },
            { status: 400 }
          );
        }

        // Reuse the orphaned auth account — update password and metadata
        const { error: updateError } =
          await guard.adminClient.auth.admin.updateUserById(existingUser.id, {
            password: authPassword,
            email_confirm: true,
            // v1.9.3: NO user_metadata — match old admin system behavior
          });

        if (updateError) {
          console.error("[/api/admin/users] updateUserById error:", updateError);
          return NextResponse.json(
            {
              success: false,
              error: `ไม่สามารถอัปเดตบัญชี Auth ที่มีอยู่ได้: ${updateError.message}`,
            },
            { status: 400 }
          );
        }

        finalAuthUid = existingUser.id;
      } else {
        // Different auth error — abort
        console.error("[/api/admin/users] auth.createUser:", authError);
        return NextResponse.json(
          {
            success: false,
            error: `ไม่สามารถสร้างบัญชี Auth ได้: ${errMsg}`,
          },
          { status: 400 }
        );
      }
    } else {
      finalAuthUid = authUser.user.id;
    }

    // 2. Insert council_users row
    // v1.7: NO color column (schema_sc.md confirms). filterPayload() also
    // drops any other keys that don't exist as columns.
    //
    // v1.9.1: For student accounts, do NOT insert `email` into council_users.
    // v1.9.2: Use finalAuthUid (which may be from a reused auth account).
    const insertPayload = filterPayload("council_users", {
      auth_uid: finalAuthUid,
      full_name: fullName,
      student_id: studentId || "",
      email: acctType === "student" ? "" : (email || authEmail),
      year,
      role: role || "member",
      approved: true,
      disabled: false,
      account_type: acctType,
      department_id: departmentId || null,
      national_id: nationalId || "",
      avatar_url: avatarUrl ?? null,
      // NOTE: NO color — council_users has no color column
    });

    const { error: insertError } = await guard.adminClient
      .from("council_users")
      .insert(insertPayload);

    if (insertError) {
      console.error("[/api/admin/users] council_users insert:", insertError);
      // v1.9.2: Only delete the auth user if we created it new (not reused)
      if (authUser.user) {
        try {
          await guard.adminClient.auth.admin.deleteUser(authUser.user.id);
        } catch (cleanupErr) {
          console.error("[/api/admin/users] cleanup failed:", cleanupErr);
        }
      }
      return NextResponse.json(
        {
          success: false,
          error: `ไม่สามารถสร้างบัญชีผู้ใช้ได้: ${insertError.message}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/admin/users]", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
