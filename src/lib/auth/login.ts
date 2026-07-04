/**
 * Auth helpers for YP Admin.
 *
 * Pattern (matches yplabs):
 * - Students: synthesize email `student_<code>@yplabs.internal`, password = student_code
 * - Teachers/Others: real email + password
 *
 * Only users with role='admin' AND approved=true AND disabled=false can log in.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, SessionUser } from "@/lib/types/database";
import { synthesizeStudentEmail, roleLabel } from "@/lib/utils/format";

export interface LoginResult {
  success: boolean;
  user?: SessionUser;
  error?: string;
  errors?: {
    nationalId?: string;
    studentCode?: string;
    email?: string;
    password?: string;
  };
}

/**
 * Validate student login input.
 */
export function validateStudent(nationalId: string, studentCode: string) {
  const errors: { nationalId?: string; studentCode?: string } = {};
  const cleanNational = (nationalId || "").replace(/\D/g, "");
  const cleanStudent = (studentCode || "").replace(/\D/g, "");

  if (cleanNational.length !== 13) {
    errors.nationalId = "เลขบัตรประชาชนต้องมี 13 หลัก";
  }
  if (cleanStudent.length !== 5) {
    errors.studentCode = "รหัสนักเรียนต้องมี 5 หลัก";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate teacher/other login input.
 */
export function validateOther(email: string, password: string) {
  const errors: { email?: string; password?: string } = {};
  const emailClean = (email || "").trim();
  if (!emailClean) {
    errors.email = "กรุณากรอกอีเมล";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
    errors.email = "รูปแบบอีเมลไม่ถูกต้อง";
  }
  if (!password) {
    errors.password = "กรุณากรอกรหัสผ่าน";
  } else if (password.length < 6) {
    errors.password = "รหัสผ่านต้องไม่น้อยกว่า 6 ตัว";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Map a council_users row to a SessionUser.
 *
 * v1.6: `color` falls back to a default brand color (the column exists but
 * may be empty for legacy users). `avatarUrl` is a real column now.
 */
function toSessionUser(row: Database["public"]["Tables"]["council_users"]["Row"]): SessionUser {
  return {
    id: row.id,
    authUid: row.auth_uid || "",
    name: row.full_name,
    role: row.role,
    roleLabel: roleLabel(row.role, row.account_type),
    departmentId: row.department_id ?? null,
    color: row.color || "#0EA5E9",
    nationalId: row.national_id || "",
    studentCode: row.student_id || "",
    email: row.email || "",
    accountType: row.account_type,
    year: row.year,
    avatarUrl: row.avatar_url ?? null,
  };
}

/**
 * Login as student (national ID + student code).
 * Admin-only — non-admins are rejected.
 */
export async function loginStudent(
  supabase: SupabaseClient<Database>,
  nationalId: string,
  studentCode: string
): Promise<LoginResult> {
  const cleanNational = (nationalId || "").replace(/\D/g, "");
  const cleanStudent = (studentCode || "").replace(/\D/g, "");

  const { valid, errors } = validateStudent(cleanNational, cleanStudent);
  if (!valid) {
    return {
      success: false,
      errors,
      error: "ข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง",
    };
  }

  // Sign in with synthesized email + password = student_code (yplabs pattern)
  const email = synthesizeStudentEmail(cleanStudent);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: cleanStudent,
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: "ไม่พบบัญชีในระบบ — ตรวจสอบเลขบัตรประชาชนและรหัสนักเรียนอีกครั้ง",
    };
  }

  // Fetch profile from council_users via RLS (authenticated)
  const { data: profile, error: profileError } = await supabase
    .from("council_users")
    .select("*")
    .eq("auth_uid", authData.user.id)
    .single();

  if (profileError || !profile) {
    return {
      success: false,
      error: "ไม่พบโปรไฟล์ในระบบ — กรุณาติดต่อผู้ดูแล",
    };
  }

  // Admin-only check
  if (profile.role !== "admin") {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "บัญชีนี้ไม่มีสิทธิ์เข้าถึงระบบหลังบ้าน — สำหรับผู้ดูแลระบบเท่านั้น",
    };
  }

  // Verify national_id matches (defensive — yplabs pattern)
  if (profile.national_id && profile.national_id !== cleanNational) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "เลขบัตรประชาชนไม่ตรงกับบัญชี",
    };
  }

  if (profile.disabled) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
    };
  }

  if (!profile.approved) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "บัญชีนี้ยังไม่ได้รับการอนุมัติ",
    };
  }

  return { success: true, user: toSessionUser(profile) };
}

/**
 * Login as teacher/other (email + password).
 * Admin-only — non-admins are rejected.
 */
export async function loginOther(
  supabase: SupabaseClient<Database>,
  email: string,
  password: string
): Promise<LoginResult> {
  const { valid, errors } = validateOther(email, password);
  if (!valid) {
    return {
      success: false,
      errors,
      error: "ข้อมูลไม่ครบหรือรูปแบบไม่ถูกต้อง",
    };
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (authError || !authData.user) {
    return {
      success: false,
      error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("council_users")
    .select("*")
    .eq("auth_uid", authData.user.id)
    .single();

  if (profileError || !profile) {
    return {
      success: false,
      error: "ไม่พบโปรไฟล์ในระบบ — กรุณาติดต่อผู้ดูแล",
    };
  }

  // Students must use student login flow
  if (profile.account_type === "student") {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "บัญชีนักเรียนต้องเข้าสู่ระบบผ่านแท็บ 'นักเรียน'",
    };
  }

  if (profile.role !== "admin") {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "บัญชีนี้ไม่มีสิทธิ์เข้าถึงระบบหลังบ้าน — สำหรับผู้ดูแลระบบเท่านั้น",
    };
  }

  if (profile.disabled) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
    };
  }

  if (!profile.approved) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "บัญชีนี้ยังไม่ได้รับการอนุมัติ",
    };
  }

  return { success: true, user: toSessionUser(profile) };
}

/**
 * Get the current session user (client-side).
 * Returns null if not logged in or not an admin.
 */
export async function getCurrentSessionUser(
  supabase: SupabaseClient<Database>
): Promise<SessionUser | null> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data: profile } = await supabase
    .from("council_users")
    .select("*")
    .eq("auth_uid", authData.user.id)
    .single();

  if (!profile) return null;
  if (profile.role !== "admin" || profile.disabled || !profile.approved) {
    return null;
  }

  return toSessionUser(profile);
}
