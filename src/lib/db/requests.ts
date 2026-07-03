import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, CouncilJoinRequest } from "@/lib/types/database";
import { synthesizeStudentEmail } from "@/lib/utils/format";

type Client = SupabaseClient<Database>;

/**
 * Fetch all pending join requests, ordered by creation date descending.
 */
export async function getRequests(
  supabase: Client,
): Promise<CouncilJoinRequest[]> {
  const { data } = await supabase
    .from("council_join_requests")
    .select("*")
    .order("created_at", { ascending: false });
  return (data as CouncilJoinRequest[]) || [];
}

/**
 * Reject (delete) a join request by ID.
 * Returns { success, error? }.
 */
export async function rejectRequest(
  supabase: Client,
  requestId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from("council_join_requests")
    .delete()
    .eq("id", requestId);

  if (error) {
    console.error("[rejectRequest]", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

/**
 * Approve a join request (server-side only).
 *
 * Steps:
 * 1. Fetch the request from council_join_requests
 * 2. Create a Supabase Auth user (admin client — bypasses RLS)
 * 3. Insert a council_users row (browser client with user context)
 * 4. Delete the request
 *
 * @param adminClient  - Service-role Supabase client (bypasses RLS)
 * @param client       - Regular Supabase client (for council_users insert)
 * @param requestId    - UUID of the join request to approve
 */
export async function approveRequest(
  adminClient: Client,
  client: Client,
  requestId: string,
): Promise<{ success: boolean; error?: string }> {
  // 1. Fetch the request
  const { data: request, error: fetchError } = await adminClient
    .from("council_join_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    return { success: false, error: "ไม่พบคำขอนี้" };
  }

  const req = request as CouncilJoinRequest;

  // 2. Determine email and password
  let email: string;
  let password: string;

  if (req.account_type === "student" && req.student_id) {
    email = synthesizeStudentEmail(req.student_id);
    password = req.student_id;
  } else {
    email = req.email || `${req.full_name.replace(/\s+/g, ".").toLowerCase()}@yplabs.internal`;
    password = "123456";
  }

  // 3. Create Supabase Auth user
  const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: req.full_name,
      student_id: req.student_id || "",
      account_type: req.account_type,
    },
  });

  if (authError || !authUser.user) {
    console.error("[approveRequest] Auth createUser error:", authError);
    return { success: false, error: "ไม่สามารถสร้างบัญชี Auth ได้" };
  }

  // 4. Insert council_users row
  const { error: insertError } = await client.from("council_users").insert({
    auth_uid: authUser.user.id,
    full_name: req.full_name,
    student_id: req.student_id || "",
    email: req.email || email,
    year: req.year,
    role: "member",
    approved: true,
    disabled: false,
    account_type: req.account_type,
    department_id: req.department_id || null,
    color: "#0EA5E9",
    national_id: req.national_id || "",
  });

  if (insertError) {
    console.error("[approveRequest] council_users insert error:", insertError);
    // Attempt to clean up the auth user
    await adminClient.auth.admin.deleteUser(authUser.user.id);
    return { success: false, error: "ไม่สามารถสร้างบัญชีผู้ใช้ได้" };
  }

  // 5. Delete the request
  const { error: deleteError } = await adminClient
    .from("council_join_requests")
    .delete()
    .eq("id", requestId);

  if (deleteError) {
    console.error("[approveRequest] delete request error:", deleteError);
    // Non-fatal — the user was already created
  }

  return { success: true };
}