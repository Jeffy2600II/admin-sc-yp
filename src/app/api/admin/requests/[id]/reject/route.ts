import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-guard";

/**
 * POST /api/admin/requests/[id]/reject
 *
 * Rejects (deletes) a council_join_request.
 * Uses the service-role client because RLS only allows the service role
 * to DELETE from council_join_requests.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;

  if (!requestId) {
    return NextResponse.json(
      { success: false, error: "Missing request id" },
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
    const { error } = await guard.adminClient
      .from("council_join_requests")
      .delete()
      .eq("id", requestId);

    if (error) {
      console.error("[/api/admin/requests/[id]/reject]", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/admin/requests/[id]/reject]", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
