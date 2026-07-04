import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-guard";
import { synthesizeStudentEmail } from "@/lib/utils/format";

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
    color,
    role,
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

    if (acctType === "student" && studentId) {
      authEmail = synthesizeStudentEmail(studentId);
      authPassword = studentId;
    } else {
      authEmail = email || `${fullName.replace(/\s+/g, ".").toLowerCase()}@yplabs.internal`;
      authPassword = "123456";
    }

    // 1. Create Supabase Auth user
    const {
      data: authUser,
      error: authError,
    } = await guard.adminClient.auth.admin.createUser({
      email: authEmail,
      password: authPassword,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        student_id: studentId || "",
        account_type: acctType,
      },
    });

    if (authError || !authUser.user) {
      console.error("[/api/admin/users] auth.createUser:", authError);
      return NextResponse.json(
        {
          success: false,
          error: authError?.message || "ไม่สามารถสร้างบัญชี Auth ได้",
        },
        { status: 400 }
      );
    }

    // 2. Insert council_users row
    const { error: insertError } = await guard.adminClient
      .from("council_users")
      .insert({
        auth_uid: authUser.user.id,
        full_name: fullName,
        student_id: studentId || "",
        email: email || authEmail,
        year,
        role: role || "member",
        approved: true,
        disabled: false,
        account_type: acctType,
        department_id: departmentId || null,
        color: color || "#0EA5E9",
        national_id: nationalId || "",
      });

    if (insertError) {
      console.error("[/api/admin/users] council_users insert:", insertError);
      // Clean up the auth user
      try {
        await guard.adminClient.auth.admin.deleteUser(authUser.user.id);
      } catch (cleanupErr) {
        console.error("[/api/admin/users] cleanup failed:", cleanupErr);
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
