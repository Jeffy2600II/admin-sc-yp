import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, CouncilUser } from "@/lib/types/database";

type Client = SupabaseClient<Database>;

/**
 * Fetch a single user by their council_users ID.
 */
export async function getUserById(
  supabase: Client,
  id: string,
): Promise<CouncilUser | null> {
  const { data } = await supabase
    .from("council_users")
    .select("*")
    .eq("id", id)
    .single();
  return data as CouncilUser | null;
}

export interface UserUpdatePatch {
  fullName?: string;
  studentId?: string;
  nationalId?: string;
  email?: string;
  role?: "admin" | "member";
  accountType?: "student" | "teacher" | "other";
  year?: number;
  departmentId?: string | null;
  approved?: boolean;
  disabled?: boolean;
  // v1.7: NO color — council_users has no color column (schema_sc.md)
}

/**
 * Update a user by their council_users ID.
 * Returns true on success, false on failure.
 */
export async function updateUser(
  supabase: Client,
  id: string,
  patch: UserUpdatePatch,
): Promise<boolean> {
  const payload: Record<string, unknown> = {};

  if (patch.fullName !== undefined) payload.full_name = patch.fullName;
  if (patch.studentId !== undefined) payload.student_id = patch.studentId;
  if (patch.nationalId !== undefined) payload.national_id = patch.nationalId;
  if (patch.email !== undefined) payload.email = patch.email;
  if (patch.role !== undefined) payload.role = patch.role;
  if (patch.accountType !== undefined) payload.account_type = patch.accountType;
  if (patch.year !== undefined) payload.year = patch.year;
  if (patch.departmentId !== undefined)
    payload.department_id = patch.departmentId;
  if (patch.approved !== undefined) payload.approved = patch.approved;
  if (patch.disabled !== undefined) payload.disabled = patch.disabled;
  // v1.7: NO color — council_users has no color column

  const { error } = await supabase
    .from("council_users")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("[updateUser]", error);
    return false;
  }
  return true;
}

/**
 * Delete a user by their council_users ID.
 * Returns true on success, false on failure.
 */
export async function deleteUser(
  supabase: Client,
  id: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("council_users")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[deleteUser]", error);
    return false;
  }
  return true;
}

/**
 * Get a human-readable role label for a user.
 */
export function getRoleLabel(user: CouncilUser): string {
  if (user.role === "admin") return "ผู้ดูแลระบบ";
  if (user.account_type === "student") return "สมาชิกสภานักเรียน";
  if (user.account_type === "teacher") return "ครูที่ปรึกษา";
  return "บุคลากร";
}