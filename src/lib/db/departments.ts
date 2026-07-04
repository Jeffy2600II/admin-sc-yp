import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Department } from "@/lib/types/database";
import { filterPayload } from "@/lib/db/schema-detect";

type Client = SupabaseClient<Database>;

/**
 * Fetch all departments, ordered by creation date.
 */
export async function getDepartments(supabase: Client): Promise<Department[]> {
  const { data } = await supabase
    .from("departments")
    .select("*")
    .order("created_at", { ascending: true });
  return (data as Department[]) || [];
}

/**
 * Fetch a single department by its ID.
 */
export async function getDepartmentById(
  supabase: Client,
  id: string,
): Promise<Department | null> {
  const { data } = await supabase
    .from("departments")
    .select("*")
    .eq("id", id)
    .single();
  return data as Department | null;
}

interface CreateDepartmentInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  // v1.5: headUserAuthUid removed — column doesn't exist in real schema
}

/**
 * Create a new department.
 *
 * v1.5: Uses filterPayload() to drop any columns that don't exist in the
 * real database schema. The head_user_auth_uid column was fabricated in
 * previous versions and never existed in the ypwork schema.
 *
 * Returns the created Department on success, or null on failure.
 */
export async function createDepartment(
  supabase: Client,
  input: CreateDepartmentInput,
): Promise<Department | null> {
  const payload = filterPayload("departments", {
    name: input.name,
    description: input.description || "",
    icon: input.icon || "👥",
    color: input.color || "#0EA5E9",
  });

  const { data, error } = await supabase
    .from("departments")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("[createDepartment]", error);
    return null;
  }
  return data as Department;
}

interface UpdateDepartmentInput {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  // v1.5: headUserAuthUid removed — column doesn't exist in real schema
}

/**
 * Update an existing department by ID.
 * Returns true on success, false on failure.
 */
export async function updateDepartment(
  supabase: Client,
  id: string,
  input: UpdateDepartmentInput,
): Promise<boolean> {
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.description !== undefined) payload.description = input.description;
  if (input.icon !== undefined) payload.icon = input.icon;
  if (input.color !== undefined) payload.color = input.color;

  // v1.5: filter to only existing columns
  const safePayload = filterPayload("departments", payload);

  const { error } = await supabase
    .from("departments")
    .update(safePayload)
    .eq("id", id);

  if (error) {
    console.error("[updateDepartment]", error);
    return false;
  }
  return true;
}

/**
 * Delete a department by ID.
 * Returns { success, error? }.
 */
export async function deleteDepartment(
  supabase: Client,
  id: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from("departments").delete().eq("id", id);

  if (error) {
    console.error("[deleteDepartment]", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}
