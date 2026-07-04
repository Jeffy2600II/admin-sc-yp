import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-guard";

/**
 * POST /api/admin/departments
 * Body: { name, description?, icon?, color?, headUserAuthUid? }
 *
 * Creates a new department. Uses service-role client for consistency with
 * other admin write routes (departments RLS actually allows authenticated
 * writes, but we use the service role here so all admin writes go through
 * the same auth-guarded path).
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

  const { name, description, icon, color, headUserAuthUid } = body;

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
    const { data, error } = await guard.adminClient
      .from("departments")
      .insert({
        id: `d${Date.now().toString(36)}`,
        name,
        description: description || "",
        icon: icon || "👥",
        color: color || "#0EA5E9",
        head_user_auth_uid: headUserAuthUid ?? null,
      })
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
