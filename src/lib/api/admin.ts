/**
 * YP ADMIN · API CLIENT HELPERS (v1.8)
 *
 * Thin wrappers around fetch() for the admin API routes. All write
 * operations go through these helpers so the views don't have to
 * repeat the same try/catch + JSON parsing boilerplate.
 *
 * Every helper returns `{ success, error?, ...data }` matching the
 * API route response shape.
 *
 * v1.8 improvements:
 * - `apiCall` now checks HTTP status and returns a clear error when the
 *   response is not JSON (e.g., 401 redirect, 500 HTML error page).
 * - Better error messages: includes HTTP status code + server message.
 */

export interface ApiResult {
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

async function apiCall(
  url: string,
  options?: RequestInit
): Promise<ApiResult> {
  try {
    const response = await fetch(url, options);

    // v1.8: Try to parse JSON, but handle non-JSON responses gracefully
    // (e.g., 401 redirect pages, 500 HTML error pages, network proxies)
    const contentType = response.headers.get("content-type") || "";
    let data: ApiResult;
    if (contentType.includes("application/json")) {
      data = (await response.json()) as ApiResult;
    } else {
      // Non-JSON response — likely an error
      const text = await response.text().catch(() => "");
      return {
        success: false,
        error: `HTTP ${response.status}: ${text.slice(0, 200) || response.statusText}`,
      };
    }

    // v1.8: If HTTP status indicates failure but JSON says success, override
    if (!response.ok && data.success) {
      data.success = false;
      data.error = data.error || `HTTP ${response.status}`;
    }

    // v1.8: If HTTP status is OK but JSON says failure, add status context
    if (!response.ok && data.error) {
      data.error = `HTTP ${response.status}: ${data.error}`;
    }

    return data;
  } catch (err) {
    console.error(`[apiCall ${url}]`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/* ── Requests ── */

export function approveRequestApi(requestId: string): Promise<ApiResult> {
  return apiCall("/api/admin/approve-request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId }),
  });
}

export function rejectRequestApi(requestId: string): Promise<ApiResult> {
  return apiCall(`/api/admin/requests/${requestId}/reject`, {
    method: "POST",
  });
}

/* ── Users ── */

export interface CreateUserPayload {
  fullName: string;
  studentId?: string;
  nationalId?: string;
  email?: string;
  year: number;
  accountType?: string;
  departmentId?: string | null;
  // v1.7: NO color — council_users has no color column (schema_sc.md)
  role?: string;
  /** v1.6: optional admin-set password (min 6 chars). Falls back to studentId or "123456". */
  password?: string;
  /** v1.6: optional avatar URL (stored in council_users.avatar_url) */
  avatarUrl?: string | null;
}

export function createUserApi(payload: CreateUserPayload): Promise<ApiResult> {
  return apiCall("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export type UserPatch = {
  fullName?: string;
  studentId?: string;
  nationalId?: string;
  email?: string;
  role?: string;
  accountType?: string;
  year?: number;
  departmentId?: string | null;
  approved?: boolean;
  disabled?: boolean;
  // v1.7: NO color — council_users has no color column (schema_sc.md)
  /** v1.6: avatar URL (council_users.avatar_url) */
  avatarUrl?: string | null;
};

export function updateUserApi(
  userId: string,
  patch: UserPatch
): Promise<ApiResult> {
  return apiCall(`/api/admin/users/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export function deleteUserApi(userId: string): Promise<ApiResult> {
  return apiCall(`/api/admin/users/${userId}`, { method: "DELETE" });
}

/* ── Years ── */

export function addYearApi(year: number): Promise<ApiResult> {
  return apiCall("/api/admin/years", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ year }),
  });
}

export function updateYearApi(
  year: number,
  patch: { closed?: boolean }
): Promise<ApiResult> {
  return apiCall(`/api/admin/years/${year}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export function deleteYearApi(year: number): Promise<ApiResult> {
  return apiCall(`/api/admin/years/${year}`, { method: "DELETE" });
}

/* ── Departments ── */

export interface CreateDepartmentPayload {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  // v1.5: headUserAuthUid removed — column doesn't exist in real schema
}

export function createDepartmentApi(
  payload: CreateDepartmentPayload
): Promise<ApiResult> {
  return apiCall("/api/admin/departments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export type DepartmentPatch = {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  // v1.5: headUserAuthUid removed — column doesn't exist in real schema
};

export function updateDepartmentApi(
  id: string,
  patch: DepartmentPatch
): Promise<ApiResult> {
  return apiCall(`/api/admin/departments/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
}

export function deleteDepartmentApi(id: string): Promise<ApiResult> {
  return apiCall(`/api/admin/departments/${id}`, { method: "DELETE" });
}
