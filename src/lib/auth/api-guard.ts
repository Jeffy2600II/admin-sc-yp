import { createAdminClient, createClient } from "@/lib/supabase/server";
import { detectSchemaColumns } from "@/lib/db/schema-detect";

/**
 * YP ADMIN · API AUTH GUARD (v1.4)
 *
 * Verifies that the caller is an authenticated admin user.
 * Returns the admin Supabase client (service role, bypasses RLS) on success,
 * or null with an error response on failure.
 *
 * All admin API routes MUST call this to:
 * 1. Verify the caller has a valid Supabase Auth session
 * 2. Verify the caller's council_users.role === 'admin'
 * 3. Get a service-role client for the actual database writes
 *
 * Usage:
 *   const guard = await requireAdmin(request);
 *   if (!guard.ok) return guard.response;
 *   const { adminClient } = guard;
 */

export interface AdminGuard {
  ok: true;
  adminClient: Awaited<ReturnType<typeof createAdminClient>>;
  userAuthUid: string;
  userFullName: string;
}

export interface AdminGuardFail {
  ok: false;
  response: Response;
}

/**
 * Verify the caller is an authenticated admin.
 * Returns a service-role client on success, or an error Response on failure.
 */
export async function requireAdmin(): Promise<AdminGuard | AdminGuardFail> {
  // 1. Get the caller's Supabase session (from cookies)
  const userClient = await createClient();
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: "ไม่ได้เข้าสู่ระบบ" },
        { status: 401 }
      ),
    };
  }

  // 2. Look up the caller's council_users row using the service role client
  //    (RLS blocks authenticated users from reading other users' rows)
  const adminClient = createAdminClient();

  // v1.5: Detect which columns exist on the tables so subsequent INSERTs
  // and UPDATEs don't fail with "Could not find the 'X' column" errors.
  // This runs once per server process and is cached.
  await detectSchemaColumns(adminClient);

  const { data: councilUser, error: councilError } = await adminClient
    .from("council_users")
    .select("id, role, full_name, approved, disabled")
    .eq("auth_uid", user.id)
    .single();

  if (councilError || !councilUser) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: "ไม่พบบัญชีในระบบ" },
        { status: 403 }
      ),
    };
  }

  // 3. Verify the caller is an approved, non-disabled admin
  if (councilUser.role !== "admin") {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: "ไม่มีสิทธิ์เข้าถึง — เฉพาะผู้ดูแลระบบเท่านั้น" },
        { status: 403 }
      ),
    };
  }

  if (!councilUser.approved || councilUser.disabled) {
    return {
      ok: false,
      response: Response.json(
        { success: false, error: "บัญชีนี้ถูกปิดใช้งานหรือยังไม่ได้รับการอนุมัติ" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    adminClient,
    userAuthUid: user.id,
    userFullName: councilUser.full_name,
  };
}
