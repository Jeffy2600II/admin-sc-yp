import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/api-guard";

/**
 * POST /api/admin/years
 * Body: { year: number }
 *
 * Adds a new school year. Uses service-role client because RLS blocks
 * authenticated users from INSERTing into council_years.
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

  const { year } = body;
  if (!year || typeof year !== "number") {
    return NextResponse.json(
      { success: false, error: "Missing year (number)" },
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
    // Convert short year (e.g. 69) to full Buddhist year (2569)
    const fullYear = year < 100 ? 2500 + year : year;

    const { error } = await guard.adminClient.from("council_years").insert({
      year: fullYear,
      closed: false,
    });

    if (error) {
      console.error("[/api/admin/years]", error);
      // 23505 = unique_violation (year already exists)
      if (error.code === "23505") {
        return NextResponse.json(
          { success: false, error: `ปีการศึกษา ${fullYear} มีอยู่แล้ว` },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, year: fullYear });
  } catch (err) {
    console.error("[/api/admin/years]", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
