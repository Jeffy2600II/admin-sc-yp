"use client";

/**
 * YP ADMIN · LOGIN PAGE (v1.2)
 *
 * Improvements over v1.1:
 * - Uses getSafeRedirect() with open-redirect protection (ypwork pattern)
 * - Clears redirect-loop markers after successful login
 * - Cleaner redirect flow (matches demo + ypwork)
 * - Better error feedback
 */
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { loginStudent, loginOther, getCurrentSessionUser } from "@/lib/auth/login";
import {
  getSafeRedirect,
  clearRedirectMarkers,
  wasRecentlyRedirected,
} from "@/lib/auth/redirect";
import { useToast } from "@/components/framework/toast-provider";
import { IdCardIcon, UserIcon, MailIcon } from "@/lib/icons";

type LoginMode = "student" | "other";

/**
 * Inner component so we can use useSearchParams inside Suspense boundary.
 */
function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [mode, setMode] = useState<LoginMode>("student");
  const [loading, setLoading] = useState(false);

  // Where to redirect after successful login — validated for safety
  const redirectPath = getSafeRedirect(
    searchParams.get("redirect") || "/dashboard"
  );

  const navigateAfterLogin = () => {
    router.replace(redirectPath);
  };

  const [nationalId, setNationalId] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [nidError, setNidError] = useState(false);
  const [scError, setScError] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [pwdError, setPwdError] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = getBrowserClient();
      const user = await getCurrentSessionUser(supabase);
      if (mounted && user) {
        // Already logged in → go to intended destination or dashboard.
        // If we detect a recent redirect, log out to break the loop
        // (matches demo's last-login-redirect logic).
        if (wasRecentlyRedirected()) {
          await supabase.auth.signOut();
        } else {
          router.replace(redirectPath);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [router, redirectPath]);

  const handleNidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 13);
    setNationalId(v);
    setNidError(false);
  };

  const handleScChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, "").slice(0, 5);
    setStudentCode(v);
    setScError(false);
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const supabase = getBrowserClient();
    const result = await loginStudent(supabase, nationalId, studentCode);
    setLoading(false);

    if (!result.success) {
      if (result.errors?.nationalId) setNidError(true);
      if (result.errors?.studentCode) setScError(true);
      if (
        result.error &&
        !result.errors?.nationalId &&
        !result.errors?.studentCode
      ) {
        toast(result.error, "error");
      } else if (result.errors && Object.keys(result.errors).length > 0) {
        toast("กรุณาตรวจสอบข้อมูลที่กรอก", "error");
      }
      return;
    }
    // Clear redirect-loop markers so a fresh session doesn't trigger loop detection
    clearRedirectMarkers();
    toast(`สวัสดี ${result.user?.name}`, "success");
    setTimeout(() => navigateAfterLogin(), 400);
  };

  const handleOtherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const supabase = getBrowserClient();
    const result = await loginOther(supabase, email, password);
    setLoading(false);

    if (!result.success) {
      if (result.errors?.email) setEmailError(true);
      if (result.errors?.password) setPwdError(true);
      if (
        result.error &&
        !result.errors?.email &&
        !result.errors?.password
      ) {
        toast(result.error, "error");
      } else if (result.errors && Object.keys(result.errors).length > 0) {
        toast("กรุณาตรวจสอบข้อมูลที่กรอก", "error");
      }
      return;
    }
    clearRedirectMarkers();
    toast(`สวัสดี ${result.user?.name}`, "success");
    setTimeout(() => navigateAfterLogin(), 400);
  };

  return (
    <div className="login">
      <div className="login__inner">
        <div className="login__brand">
          <div className="login__logo">YP</div>
          <div className="login__brand-text">
            <div className="login__brand-name">YP Admin</div>
            <div className="login__brand-tag">Student Council Operations</div>
          </div>
        </div>

        <div className="login__hero">
          <span className="login__demo-badge">ผู้ดูแลระบบ · Admin</span>
          <h1>
            ระบบหลังบ้าน
            <br />
            สภานักเรียน
          </h1>
          <p>
            จัดการฝ่ายงาน บัญชีผู้ใช้ ปีการศึกษา และคำขอสมัครสมาชิก —
            สำหรับผู้ดูแลระบบเท่านั้น
          </p>
        </div>

        <div className="login__card">
          <h2 className="login__card-title">เข้าสู่ระบบ</h2>
          <p className="login__card-sub">
            {mode === "student"
              ? "กรอกเลขบัตรประชาชน 13 หลัก และรหัสนักเรียน 5 หลัก"
              : "กรอกอีเมลและรหัสผ่านที่ลงทะเบียนไว้"}
          </p>

          <div className="login__mode-toggle" role="tablist">
            <button
              type="button"
              className={`login__mode-btn ${mode === "student" ? "is-active" : ""}`}
              data-mode="student"
              role="tab"
              aria-selected={mode === "student"}
              onClick={() => setMode("student")}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </svg>
              นักเรียน
            </button>
            <button
              type="button"
              className={`login__mode-btn ${mode === "other" ? "is-active" : ""}`}
              data-mode="other"
              role="tab"
              aria-selected={mode === "other"}
              onClick={() => setMode("other")}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
              ครู / อื่นๆ
            </button>
          </div>

          {mode === "student" && (
            <form onSubmit={handleStudentSubmit} noValidate>
              <div className={`field ${nidError ? "has-error" : ""}`}>
                <label className="field__label" htmlFor="national-id">
                  เลขบัตรประจำตัวประชาชน
                </label>
                <div className="input-group">
                  <span className="input-group__addon">
                    <IdCardIcon size={18} />
                  </span>
                  <input
                    className="input"
                    id="national-id"
                    type="tel"
                    inputMode="numeric"
                    maxLength={13}
                    placeholder="1 1 0 0 5 0 1 2 4 5 6 2 1"
                    autoComplete="off"
                    value={nationalId}
                    onChange={handleNidChange}
                    disabled={loading}
                  />
                </div>
                <div className="field__error">เลขบัตรประชาชนต้องมี 13 หลัก</div>
              </div>

              <div className={`field ${scError ? "has-error" : ""}`}>
                <label className="field__label" htmlFor="student-code">
                  รหัสนักเรียน
                </label>
                <div className="input-group">
                  <span className="input-group__addon">
                    <UserIcon size={18} />
                  </span>
                  <input
                    className="input"
                    id="student-code"
                    type="tel"
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="3 8 0 0 1"
                    autoComplete="off"
                    value={studentCode}
                    onChange={handleScChange}
                    disabled={loading}
                  />
                </div>
                <div className="field__error">รหัสนักเรียนต้องมี 5 หลัก</div>
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--block btn--lg"
                style={{ marginTop: "8px" }}
                disabled={loading}
              >
                {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
              </button>
            </form>
          )}

          {mode === "other" && (
            <form onSubmit={handleOtherSubmit} noValidate>
              <div className={`field ${emailError ? "has-error" : ""}`}>
                <label className="field__label" htmlFor="email">
                  อีเมล
                </label>
                <div className="input-group">
                  <span className="input-group__addon">
                    <MailIcon size={18} />
                  </span>
                  <input
                    className="input"
                    id="email"
                    type="email"
                    inputMode="email"
                    placeholder="admin@school.ac.th"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(false);
                    }}
                    disabled={loading}
                  />
                </div>
                <div className="field__error">รูปแบบอีเมลไม่ถูกต้อง</div>
              </div>

              <div className={`field ${pwdError ? "has-error" : ""}`}>
                <label className="field__label" htmlFor="password">
                  รหัสผ่าน
                </label>
                <div className="input-group">
                  <span className="input-group__addon">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  </span>
                  <input
                    className="input"
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="off"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPwdError(false);
                    }}
                    disabled={loading}
                  />
                </div>
                <div className="field__error">รหัสผ่านต้องไม่น้อยกว่า 6 ตัว</div>
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--block btn--lg"
                style={{ marginTop: "8px" }}
                disabled={loading}
              >
                {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
              </button>
            </form>
          )}
        </div>

        <div className="login__footer">
          © 2026 YP Admin v1.9.3 · เฉพาะผู้ดูแลระบบเท่านั้น · เชื่อมต่อกับ Supabase
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "var(--yp-gradient-hero, linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%))",
            color: "white",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>YP Admin</div>
            <div style={{ fontSize: 14, opacity: 0.78, marginTop: 4 }}>
              กำลังโหลด…
            </div>
          </div>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
