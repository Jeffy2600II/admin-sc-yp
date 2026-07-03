import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, CouncilYear } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

/** Maximum number of recent years to retain in the active system. */
export const MAX_RETAINED = 3;

/**
 * Fetch all years, ordered descending (newest first).
 */
export async function getYears(supabase: Client): Promise<CouncilYear[]> {
  const { data } = await supabase
    .from("council_years")
    .select("*")
    .order("year", { ascending: false });
  return (data as CouncilYear[]) || [];
}

/**
 * Add a new school year.
 * Returns { success, error? }.
 */
export async function addYear(
  supabase: Client,
  year: number,
): Promise<{ success: boolean; error?: string }> {
  // Convert short year (e.g. 69) to full Buddhist year (2569)
  const fullYear = year < 100 ? 2500 + year : year;

  const { error } = await supabase.from("council_years").insert({
    year: fullYear,
    closed: false,
  });

  if (error) {
    console.error("[addYear]", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Toggle the `closed` status of a year.
 * Returns the updated row on success, or null on failure.
 */
export async function toggleYearClosed(
  supabase: Client,
  year: number,
): Promise<boolean> {
  // First, fetch current state
  const { data: current, error: fetchError } = await supabase
    .from("council_years")
    .select("closed")
    .eq("year", year)
    .single();

  if (fetchError || !current) {
    console.error("[toggleYearClosed] fetch error:", fetchError);
    return false;
  }

  const { error: updateError } = await supabase
    .from("council_years")
    .update({ closed: !current.closed })
    .eq("year", year);

  if (updateError) {
    console.error("[toggleYearClosed] update error:", updateError);
    return false;
  }
  return true;
}