import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-guard";
import { filterPayload } from "@/lib/db/schema-detect";

/**
 * POST /api/admin/departments
 * Body: { name, description?, icon?, color? }
 *
 * v1.5: Removed `headUserAuthUid` — the `head_user_auth_uid` column
 * does NOT exist in the real ypwork departments schema. The previous
 * version fabricated this column and every department creation failed
 * with "Could not find the 'head_user_auth_uid' column".
 *
 * Real departments schema (ypwork_schema.sql):
 *   id, name, color, icon, description, created_at, updated_at
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

  const { name, description, icon, color } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json(
      { success: false, error: "Missing name" },
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
    // v1.5: filter payload to only include columns that exist in the DB.
    // We don't include head_user_auth_uid because it doesn't exist.
    const insertPayload = filterPayload("departments", {
      id: `d${Date.now().toString(36)}`,
      name,
      description: description || "",
      icon: icon || "👥",
      color: color || "#0EA5E9",
    });

    const { data, error } = await guard.adminClient
      .from("departments")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error("[/api/admin/departments]", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, department: data });
  } catch (err) {
    console.error("[/api/admin/departments]", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
