/**
 * YP ADMIN · API CLIENT HELPERS (v1.4)
 *
 * Thin wrappers around fetch() for the admin API routes. All write
 * operations go through these helpers so the views don't have to
 * repeat the same try/catch + JSON parsing boilerplate.
 *
 * Every helper returns `{ success, error?, ...data }` matching the
 * API route response shape.
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
    const data = await response.json();
    return data as ApiResult;
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
  color?: string;
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
  color?: string;
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
