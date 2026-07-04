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
  // v1.9.4 CRITICAL FIX: Match yplabs EXACTLY.
  // - Student: email = synthesizeEmail(student_id), password = student_id (raw, no pad)
  // - Teacher/other: email = req.email, password = req.password (raw)
  //
  // The login flow (ypwork + yplabs) uses:
  //   student: signIn(email = student_<code>@yplabs.internal, password = student_code)
  //   teacher: signIn(email = real_email, password = real_password)
  //
  // Previously we used `req.password || student_id` and padded to 6 chars,
  // which broke student login because:
  //   1. req.password might be set (different from student_id) → mismatch
  //   2. padding "00000" → "000000" → mismatch with login's "00000"
  //
  // Now we use student_id directly (no padding, no fallback to req.password)
  // for student accounts, matching yplabs behavior exactly.
  let email: string;
  let password: string;

  if (req.account_type === "student" && req.student_id) {
    email = synthesizeStudentEmail(req.student_id);
    // v1.9.4: ALWAYS use student_id as password (matches login flow).
    // Do NOT use req.password — login doesn't know about it.
    // Do NOT pad — yplabs creates with raw 5-char student_id and it works.
    password = req.student_id;
  } else {
    // Teacher/other: use email + password from the request
    email = req.email || `${req.full_name.replace(/\s+/g, ".").toLowerCase()}@yplabs.internal`;
    password = req.password || "123456";
    // v1.9.4: Only pad for non-student accounts (student_id is used as-is)
    if (password.length < 6) {
      password = password.padEnd(6, "0");
    }
  }

  // 3. Create Supabase Auth user (adminClient — bypasses RLS)
  //
  // v1.9.2: If the synthesized email already exists in auth.users (e.g.,
  // the student was previously approved then deleted from council_users
  // but the auth account remained), createUser will fail with
  // "A user with this email address has already been registered".
  // We now:
  //   1. Try createUser first
  //   2. If it fails with "already registered", look up the existing auth
  //      user by email and reuse their auth_uid
  //   3. If the existing user's council_users row still exists, abort with
  //      a clear error message
  const {
    data: authUser,
    error: authError,
  } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // v1.9.3: NO user_metadata — old admin system didn't set display name.
    // Setting it causes login to fail because data doesn't match old accounts.
  });

  let finalAuthUid: string;

  if (authError || !authUser.user) {
    // v1.9.2: Check if the error is "already registered"
    const errMsg = authError?.message || "";
    if (errMsg.includes("already been registered") || errMsg.includes("already registered")) {
      // Look up the existing auth user by email
      const { data: existingUsers, error: listError } = await adminClient.auth.admin.listUsers();
      if (listError) {
        console.error("[approveRequest] listUsers error:", listError);
        return {
          success: false,
          error: `ไม่สามารถสร้างบัญชี Auth ได้: ${errMsg}`,
        };
      }

      const existingUser = (existingUsers.users || []).find(
        (u) => u.email === email
      );

      if (!existingUser) {
        console.error("[approveRequest] existing user not found for email:", email);
        return {
          success: false,
          error: `ไม่สามารถสร้างบัญชี Auth ได้: ${errMsg}`,
        };
      }

      // Check if the existing auth user already has a council_users row
      const { data: existingCouncilUser } = await adminClient
        .from("council_users")
        .select("id, full_name")
        .eq("auth_uid", existingUser.id)
        .maybeSingle();

      if (existingCouncilUser) {
        // The auth account is already linked to a council_users row — abort
        return {
          success: false,
          error: `บัญชีนี้ถูกสร้างไปแล้วสำหรับ "${existingCouncilUser.full_name}" — ไม่สามารถอนุมัติคำขอซ้ำได้`,
        };
      }

      // The auth account exists but has no council_users row (orphaned).
      // Reuse it — update password and metadata to match the new request.
      const { error: updateError } = await adminClient.auth.admin.updateUserById(
        existingUser.id,
        {
          password,
          email_confirm: true,
          // v1.9.3: NO user_metadata — match old admin system behavior
        }
      );

      if (updateError) {
        console.error("[approveRequest] updateUserById error:", updateError);
        return {
          success: false,
          error: `ไม่สามารถอัปเดตบัญชี Auth ที่มีอยู่ได้: ${updateError.message}`,
        };
      }

      finalAuthUid = existingUser.id;
    } else {
      // Different auth error — abort
      console.error("[approveRequest] Auth createUser error:", authError);
      return {
        success: false,
        error: `ไม่สามารถสร้างบัญชี Auth ได้: ${errMsg}`,
      };
    }
  } else {
    finalAuthUid = authUser.user.id;
  }

  // 4. Insert council_users row (adminClient — bypasses RLS)
  //
  // v1.7: `color` is NOT a column on council_users (confirmed by schema_sc.md).
  // v1.9.1: For student accounts, do NOT insert `email` into council_users.
  // v1.9.2: Use finalAuthUid (which may be from a reused auth account).
  //
  // filterPayload() also drops any other keys that don't exist as columns.
  const insertPayload = filterPayload("council_users", {
    auth_uid: finalAuthUid,
    full_name: req.full_name,
    student_id: req.student_id || "",
    email: req.account_type === "student" ? "" : (req.email || email),
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
    // v1.9.2: Only delete the auth user if we created it new (not reused).
    // If we reused an existing auth account, deleting it would break things.
    if (authUser.user) {
      try {
        await adminClient.auth.admin.deleteUser(authUser.user.id);
      } catch (cleanupErr) {
        console.error(
          "[approveRequest] failed to clean up auth user after insert failure:",
          cleanupErr
        );
      }
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
