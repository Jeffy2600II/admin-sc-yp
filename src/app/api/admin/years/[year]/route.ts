import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-guard";

/**
 * PATCH /api/admin/years/[year]
 * Body: { closed?: boolean }
 *
 * Toggles or sets the `closed` status of a school year.
 * Uses service-role client because RLS blocks authenticated users from
 * UPDATEing council_years.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year: yearStr } = await params;
  const year = Number(yearStr);

  if (!Number.isInteger(year)) {
    return NextResponse.json(
      { success: false, error: "Invalid year" },
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

  const payload: Record<string, unknown> = {};
  if (body.closed !== undefined) payload.closed = !!body.closed;

  if (Object.keys(payload).length === 0) {
    return NextResponse.json(
      { success: false, error: "No fields to update" },
      { status: 400 }
    );
  }

  try {
    const { error } = await guard.adminClient
      .from("council_years")
      .update(payload)
      .eq("year", year);

    if (error) {
      console.error("[/api/admin/years/[year]] PATCH:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/admin/years/[year]] PATCH:", err);
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
 * DELETE /api/admin/years/[year]
 *
 * Deletes a school year. Uses service-role client because RLS blocks
 * authenticated users from DELETEing council_years.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ year: string }> }
) {
  const { year: yearStr } = await params;
  const year = Number(yearStr);

  if (!Number.isInteger(year)) {
    return NextResponse.json(
      { success: false, error: "Invalid year" },
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
      .from("council_years")
      .delete()
      .eq("year", year);

    if (error) {
      console.error("[/api/admin/years/[year]] DELETE:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/admin/years/[year]] DELETE:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
