import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-guard";
import { approveRequest } from "@/lib/db/requests";

/**
 * POST /api/admin/approve-request
 * Body: { requestId: string }
 *
 * v1.4: Now uses requireAdmin() to verify the caller is an authenticated
 * admin, then uses the service-role client for ALL operations (bypasses
 * RLS). Previously used a mix of admin + browser clients, which caused
 * the council_users INSERT to be blocked by RLS.
 */
export async function POST(request: NextRequest) {
  let requestId: string | undefined;
  try {
    const body = await request.json();
    requestId = body?.requestId;
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!requestId || typeof requestId !== "string") {
    return NextResponse.json(
      { success: false, error: "Missing requestId" },
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
    const result = await approveRequest(guard.adminClient, requestId);
    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (err) {
    console.error("[/api/admin/approve-request]", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
