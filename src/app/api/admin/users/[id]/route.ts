import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-guard";
import { filterPayload } from "@/lib/db/schema-detect";

/**
 * PATCH /api/admin/users/[id]
 * Body: partial CouncilUser patch (fullName, role, approved, disabled, etc.)
 *
 * Updates a council_users row by ID. Uses service-role client because RLS
 * blocks authenticated users from UPDATEing council_users (except their
 * own row, which isn't enough for an admin managing other users).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Missing user id" },
      { status: 400 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
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

  // Build the update payload from camelCase → snake_case
  const payload: Record<string, unknown> = {};
  if (body.fullName !== undefined) payload.full_name = body.fullName;
  if (body.studentId !== undefined) payload.student_id = body.studentId;
  if (body.nationalId !== undefined) payload.national_id = body.nationalId;
  if (body.email !== undefined) payload.email = body.email;
  if (body.role !== undefined) payload.role = body.role;
  if (body.accountType !== undefined) payload.account_type = body.accountType;
  if (body.year !== undefined) payload.year = body.year;
  if (body.departmentId !== undefined) payload.department_id = body.departmentId;
  if (body.approved !== undefined) payload.approved = body.approved;
  if (body.disabled !== undefined) payload.disabled = body.disabled;
  if (body.color !== undefined) payload.color = body.color;
  // v1.6: avatarUrl (real column)
  if (body.avatarUrl !== undefined) payload.avatar_url = body.avatarUrl;

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { success: false, error: "No fields to update" },
      { status: 400 }
    );
  }

  try {
    // v1.5: filter payload to only include columns that exist in the DB
    const safePayload = filterPayload("council_users", payload);
    const { error } = await guard.adminClient
      .from("council_users")
      .update(safePayload)
      .eq("id", id);

    if (error) {
      console.error("[/api/admin/users/[id]] PATCH:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/admin/users/[id]] PATCH:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 *
 * Deletes a council_users row AND the associated Supabase Auth user.
 * Uses service-role client because RLS blocks authenticated users from
 * DELETEing council_users.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { success: false, error: "Missing user id" },
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
    // 1. Fetch the user to get their auth_uid (for auth cleanup)
    const { data: user, error: fetchError } = await guard.adminClient
      .from("council_users")
      .select("auth_uid, full_name")
      .eq("id", id)
      .single();

    if (fetchError || !user) {
      console.error("[/api/admin/users/[id]] DELETE fetch:", fetchError);
      return NextResponse.json(
        { success: false, error: "ไม่พบผู้ใช้นี้" },
        { status: 404 }
      );
    }

    // Prevent self-deletion
    if (user.auth_uid === guard.userAuthUid) {
      return NextResponse.json(
        { success: false, error: "ไม่สามารถลบบัญชีตัวเองได้" },
        { status: 400 }
      );
    }

    // 2. Delete the council_users row
    const { error: deleteError } = await guard.adminClient
      .from("council_users")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("[/api/admin/users/[id]] DELETE:", deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 400 }
      );
    }

    // 3. Delete the Supabase Auth user (non-fatal if this fails)
    if (user.auth_uid) {
      try {
        await guard.adminClient.auth.admin.deleteUser(user.auth_uid);
      } catch (authErr) {
        console.error(
          "[/api/admin/users/[id]] auth.deleteUser (non-fatal):",
          authErr
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/admin/users/[id]] DELETE:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
