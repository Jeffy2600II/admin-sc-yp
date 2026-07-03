/**
 * Utility functions ported from ypadmin-demo-v1.5 core/ui.js
 * — date formatting (Thai locale), national ID masking, escape HTML, etc.
 */

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];
const THAI_DAYS = [
  "อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์",
];

export function escapeHtml(str: string | null | undefined): string {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(
  dateStr: string | null | undefined,
  opts: { short?: boolean; long?: boolean } = {}
): string {
  if (!dateStr) return "";
  const d = parseDate(dateStr);
  if (!d) return "";
  if (opts.short) {
    return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${
      d.getFullYear() + 543
    }`;
  }
  if (opts.long) {
    return `วัน${THAI_DAYS[d.getDay()]}ที่ ${d.getDate()} ${
      THAI_MONTHS[d.getMonth()]
    } ${d.getFullYear() + 543}`;
  }
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function formatDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "เมื่อกี้";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ชม. ที่แล้ว`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} วันที่แล้ว`;
  return formatDate(d.toISOString().slice(0, 10), { short: true });
}

export function maskNationalId(id: string | null | undefined): string {
  if (!id || id.length !== 13) return id || "";
  return `${id.slice(0, 3)}-XXXX-XXXXX-${id.slice(-2)}`;
}

export function accountTypeLabel(type: string | null | undefined): string {
  return (
    ({ student: "นักเรียน", teacher: "ครู", other: "อื่นๆ" } as Record<
      string,
      string
    >)[type || "student"] || type || "นักเรียน"
  );
}

export function accountTypeIcon(type: string | null | undefined): string {
  return (
    ({ student: "🎓", teacher: "👨‍🏫", other: "👤" } as Record<string, string>)[
      type || "student"
    ] || "👤"
  );
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2);
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function roleLabel(role: string, accountType: string): string {
  if (role === "admin") return "ผู้ดูแลระบบ";
  if (accountType === "student") return "สมาชิกสภานักเรียน";
  if (accountType === "teacher") return "ครูที่ปรึกษา";
  return "บุคลากร";
}

/**
 * Synthesize a stable email for student login.
 * Pattern from yplabs: student_<code>@yplabs.internal
 * — the password is the student_code itself.
 */
export function synthesizeStudentEmail(studentCode: string): string {
  return `student_${studentCode}@yplabs.internal`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
