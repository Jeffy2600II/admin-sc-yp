# YP Admin v1.0

> **ระบบหลังบ้านสำหรับสภานักเรียน** — จัดการฝ่ายงาน บัญชีผู้ใช้ ปีการศึกษา และคำขอสมัครสมาชิก
> Next.js 16 + TypeScript + React + Supabase · Deploy บน Vercel
> UI/UX สืบทอดจาก ypadmin-demo-v1.5 (Sky Blue + Cyan บนพื้นขาว)

---

## ภาพรวมระบบ

YP Admin เป็นระบบหลังบ้านสำหรับสภานักเรียน ทำหน้าที่จัดการ 4 ฟีเจอร์หลัก:

1. **ฝ่ายงาน** — CRUD + หัวหน้าฝ่าย + สี + ไอคอน
2. **บัญชีผู้ใช้** — CRUD + บทบาท + อนุมัติ + ปิดบัญชี + รีเซ็ตรหัสผ่าน + ลบ + ค้นหา/กรอง
3. **ปีการศึกษา** — CRUD + เก็บข้อมูล 3 ปีล่าสุด + เปิด/ปิดรับ (มี confirmation)
4. **คำขอสมัครสมาชิก** — อนุมัติ (auto-create Supabase Auth account) / ปฏิเสธ + detail bottom sheet

### ข้อกำหนดการเข้าถึง
- เฉพาะผู้ใช้ที่มี `role = 'admin'` ในตาราง `council_users` เท่านั้นที่เข้าสู่ระบบได้
- สมาชิก (`role = 'member'`) จะถูกปฏิเสธการเข้าถึง

---

## เทคโนโลยี

| Layer | Tech |
|-------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| UI Library | React 19 |
| Styling | Tailwind CSS 4 + demo's design tokens (Sky Blue + Cyan) |
| Database | Supabase (PostgreSQL) — shared with yplabs + ypwork |
| Auth | Supabase Auth + custom admin guard |
| Realtime | Supabase Realtime (built-in) |

---

## โครงสร้างไฟล์

```
ypadmin/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    ← Root layout (fonts + providers)
│   │   ├── page.tsx                      ← Root redirect (→ /dashboard or /login)
│   │   ├── globals.css                   ← Tailwind + demo's design system
│   │   ├── login/page.tsx                ← Login page (admin only)
│   │   ├── (app)/                        ← Protected routes (admin only)
│   │   │   ├── layout.tsx                ← App shell wrapper (auth guard)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── requests/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx         ← Auto-open detail sheet
│   │   │   ├── users/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── departments/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── years/page.tsx
│   │   │   └── profile/page.tsx
│   │   └── api/admin/approve-request/route.ts  ← Server action (creates Supabase Auth user)
│   ├── components/
│   │   ├── layout/app-shell.tsx          ← Top-bar + sidebar + FAB
│   │   ├── framework/                    ← Bottom sheet, avatar, danger-confirm, toast, auth
│   │   ├── views/                        ← Page-level components (8 views)
│   │   └── ui-blocks/index.tsx           ← UI primitives (Button, Card, Stat, etc.)
│   ├── lib/
│   │   ├── supabase/{client,server,middleware}.ts
│   │   ├── auth/login.ts                 ← Student + teacher login (admin-only)
│   │   ├── db/{users,departments,years,requests}.ts  ← CRUD functions
│   │   ├── types/database.ts             ← TypeScript types matching DB schema
│   │   ├── utils/format.ts               ← Date, mask, initials, etc.
│   │   └── icons.tsx                     ← SVG icon set (Lucide-style)
│   ├── styles/                           ← Demo's CSS (tokens, base, layout, components, pages, framework)
│   └── middleware.ts                     ← Session refresh
├── public/
│   ├── manifest.json                     ← PWA manifest
│   ├── icons/                            ← PWA icons
│   └── logo.svg
├── supabase/migrations/ypadmin_schema.sql ← Schema documentation + RLS + seed
├── .env.example
├── next.config.ts
├── tsconfig.json
├── eslint.config.mjs
├── package.json
└── README.md
```

---

## การติดตั้งและ Deploy บน Vercel

### 1. เตรียม Supabase Project
ใช้ Supabase project เดียวกับ yplabs/ypwork (shared database) และรัน migration:

```bash
# รันใน Supabase SQL Editor ตามลำดับ:
# 1. yplabs/supabase/migrations/20260429121736_001_create_all_tables_and_enable_realtime.sql
# 2. ypwork/supabase/migrations/ypwork_schema.sql
# 3. ypwork/ypwork-v1.7-update.sql
# 4. ypwork/ypwork-v1.8-update.sql
# 5. ypwork/ypwork-v1.8.1-update.sql
```

หรือถ้ายังไม่มี schema ทั้งหมด รัน `supabase/migrations/ypadmin_schema.sql` จาก repo นี้ (รวมทุกอย่างในไฟล์เดียว)

### 2. สร้าง Admin User แรก
ใน Supabase Dashboard → Authentication → Users → Add user:
- **Email**: `student_38001@yplabs.internal` (นักเรียน) หรือ `admin@school.ac.th` (ครู)
- **Password**: `38001` (นักเรียน — ใช้รหัสนักเรียน) หรือรหัสผ่านที่ตั้งเอง (ครู)
- ✓ Auto Confirm User

จากนั้นรัน SQL:
```sql
INSERT INTO public.council_users (
  auth_uid, full_name, student_id, year, role,
  approved, disabled, account_type,
  department_id, color, national_id
) VALUES (
  'PASTE-AUTH-UID-HERE',
  'ชื่อ แอดมิน',
  '38001', 68, 'admin',
  true, false, 'student',
  'd1', '#0EA5E9', '1100501245621'
);
```

### 3. Deploy บน Vercel
1. Push code ไป GitHub repo
2. ใน Vercel → "New Project" → เลือก repo
3. ตั้งค่า Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy! (Vercel จะตรวจ Next.js อัตโนมัติ)

---

## การ Login

### สำหรับนักเรียน (admin)
- **เลขบัตรประชาชน**: 13 หลัก
- **รหัสนักเรียน**: 5 หลัก (password ใน Supabase Auth คือรหัสนักเรียน)
- ระบบจะ synthesize email เป็น `student_<รหัส>@yplabs.internal` อัตโนมัติ

### สำหรับครู/อื่นๆ (admin)
- **อีเมล**: email จริงที่ลงทะเบียนไว้
- **รหัสผ่าน**: รหัสผ่านที่ตั้งไว้ (อย่างน้อย 6 ตัว)

> ⚠️ ผู้ใช้ที่ไม่ใช่ admin (`role != 'admin'`) จะถูกปฏิเสธการเข้าถึง

---

## ฟีเจอร์เด่น

- **Side bar navigation** (slide-in จากซ้าย + backdrop + animation)
- **Bottom sheet system** (drag-to-dismiss, stack, scroll-lock, history support, popup mode ≥768px)
- **Danger Zone safety** (2-step type-to-confirm สำหรับการลบ)
- **1-step warning** สำหรับ reversible actions (ปิดบัญชี, ปิดปี, ปฏิเสธคำขอ, ออกจากระบบ)
- **Request detail bottom sheet** (auto-open จาก dashboard)
- **Edit dept modal แยกจาก edit info** (ลดความซ้ำซ้อน)
- **Mobile-first responsive** (iPhone 14 → desktop)
- **PWA-ready** (manifest + icons)
- **Sky Blue + Cyan accent** บนพื้นขาวสะอาด

---

## Routes

| Path | Page | Sidebar | FAB |
|------|------|---------|-----|
| `/login` | Login | — | — |
| `/dashboard` | หน้าแรก | ✓ | — |
| `/requests` | คำขอสมัครสมาชิก | ✓ | — |
| `/requests/[id]` | คำขอสมัคร + auto-open detail | ✓ | — |
| `/users` | บัญชีผู้ใช้ | ✓ | ✓ |
| `/users/[id]` | รายละเอียดบัญชี | — (back) | — |
| `/departments` | ฝ่ายงาน | ✓ | ✓ |
| `/departments/[id]` | รายละเอียดฝ่าย | — (back) | — |
| `/years` | ปีการศึกษา | ✓ | ✓ |
| `/profile` | โปรไฟล์ | ✓ | — |

---

## Database Tables (shared with yplabs + ypwork)

- `council_users` — user accounts (with ypwork extensions: department_id, color, national_id)
- `council_years` — school years (Buddhist era)
- `council_join_requests` — pending membership applications
- `departments` — student council departments (ypwork-owned)

ดู schema เต็มที่ `supabase/migrations/ypadmin_schema.sql`

---

© 2026 YP Admin · v1.0
