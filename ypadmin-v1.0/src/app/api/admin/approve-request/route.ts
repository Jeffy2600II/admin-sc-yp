import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { approveRequest } from "@/lib/db/requests";

/**
 * POST /api/admin/approve-request
 * Body: { requestId: string }
 *
 * Approves a council_join_request by:
 * 1. Creating a Supabase Auth account (admin client — bypasses RLS)
 * 2. Inserting a council_users row (browser client)
 * 3. Deleting the request
 *
 * Requires service-role key — server-only route.
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

  try {
    const adminClient = createAdminClient();
    const browserClient = await createClient();
    const result = await approveRequest(adminClient, browserClient, requestId);
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
