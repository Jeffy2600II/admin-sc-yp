import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, CouncilJoinRequest } from "@/lib/types/database";
import { synthesizeStudentEmail } from "@/lib/utils/format";
import { filterPayload } from "@/lib/db/schema-detect";

type Client = SupabaseClient<Database>;

/**
 * Fetch all pending join requests, ordered by creation date descending.
 * Safe to call from the browser (RLS allows authenticated SELECT).
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
 *
 * v1.4: This now requires an adminClient (service role) because RLS on
 * council_join_requests only allows the service role to DELETE. The
 * browser client can only SELECT/INSERT.
 *
 * @param adminClient - Service-role Supabase client (bypasses RLS)
 * @param requestId   - UUID of the join request to reject
 */
export async function rejectRequest(
  adminClient: Client,
  requestId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await adminClient
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
 * v1.4 FIX: ALL database writes now use the adminClient (service role)
 * which bypasses RLS. Previously the council_users INSERT used the
 * browser client, which RLS blocked — so approving requests always
 * failed with "ไม่สามารถสร้างบัญชีผู้ใช้ได้".
 *
 * Steps:
 * 1. Fetch the request from council_join_requests (adminClient)
 * 2. Create a Supabase Auth user (adminClient.auth.admin.createUser)
 * 3. Insert a council_users row (adminClient — bypasses RLS)
 * 4. Delete the request (adminClient — bypasses RLS)
 *
 * @param adminClient  - Service-role Supabase client (bypasses RLS)
 * @param requestId    - UUID of the join request to approve
 */
export async function approveRequest(
  adminClient: Client,
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
  //
  // v1.6: Use the password from the join_requests row if available (the
  // real schema has a `password` column that the applicant set when
  // submitting). Fall back to student_id (legacy yplabs pattern) only if
  // the password column is empty.
  let email: string;
  let password: string;

  if (req.account_type === "student" && req.student_id) {
    email = synthesizeStudentEmail(req.student_id);
    // v1.6: prefer the applicant-set password from join_requests
    password = req.password || req.student_id;
  } else {
    email =
      req.email ||
      `${req.full_name.replace(/\s+/g, ".").toLowerCase()}@yplabs.internal`;
    // v1.6: prefer the applicant-set password, fall back to default
    password = req.password || "123456";
  }

  // Guard: password must be at least 6 chars (Supabase Auth minimum)
  if (password.length < 6) {
    // Pad with zeros to reach 6 chars (preserves the original intent)
    password = password.padEnd(6, "0");
  }

  // 3. Create Supabase Auth user (adminClient — bypasses RLS)
  const {
    data: authUser,
    error: authError,
  } = await adminClient.auth.admin.createUser({
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
    return {
      success: false,
      error: authError?.message || "ไม่สามารถสร้างบัญชี Auth ได้",
    };
  }

  // 4. Insert council_users row (adminClient — bypasses RLS)
  //
  // v1.7: `color` is NOT a column on council_users (confirmed by schema_sc.md).
  // The previous version included `color: "#0EA5E9"` in the INSERT, which
  // caused "Could not find the 'color' column" errors. Now we omit it.
  // User avatar color is derived from their department at render time.
  //
  // filterPayload() also drops any other keys that don't exist as columns.
  const insertPayload = filterPayload("council_users", {
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
    national_id: req.national_id || "",
    // NOTE: NO color — council_users has no color column (schema_sc.md)
  });

  const { error: insertError } = await adminClient
    .from("council_users")
    .insert(insertPayload);

  if (insertError) {
    console.error("[approveRequest] council_users insert error:", insertError);
    // Attempt to clean up the auth user we just created
    try {
      await adminClient.auth.admin.deleteUser(authUser.user.id);
    } catch (cleanupErr) {
      console.error(
        "[approveRequest] failed to clean up auth user after insert failure:",
        cleanupErr
      );
    }
    return {
      success: false,
      error: `ไม่สามารถสร้างบัญชีผู้ใช้ได้: ${insertError.message}`,
    };
  }

  // 5. Delete the request (adminClient — bypasses RLS)
  const { error: deleteError } = await adminClient
    .from("council_join_requests")
    .delete()
    .eq("id", requestId);

  if (deleteError) {
    console.error("[approveRequest] delete request error:", deleteError);
    // Non-fatal — the user was already created, just log the error
  }

  return { success: true };
}
