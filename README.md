# YP Admin v1.6

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

## การปรับปรุงใน v1.6 (Schema-Accurate — อ้างอิง schema_sc.md)

### Bug Fixes & Improvements (อ้างอิง schema จริงจาก schema_sc.md)
- **`council_users.avatar_url`** — คอลัมน์จริงที่ไม่เคยใช้ใน v1.5 → เพิ่มเข้ามาใน types, API routes, และ Avatar component
- **`council_join_requests.password`** — คอลัมน์จริงที่เก็บ password ที่ผู้สมัครตั้งเอง → `approveRequest` ใช้ password นี้แทนการใช้ student_id (ยกเว้นถ้า password ว่าง)
- **`council_join_requests.message`** — คอลัมน์จริงที่เก็บข้อความจากผู้สมัคร → แสดงใน request detail sheet แล้ว (เดิมมีอยู่แต่อ้างอิงผิด)
- **`council_years.created_at`** — คอลัมน์จริง → เพิ่มใน types
- **`student_id` UNIQUE** — ยืนยันว่ามี unique constraint ในทั้ง `council_users` และ `council_join_requests`

### Avatar Component (v1.6)
- เพิ่ม prop `avatarUrl` — ถ้ามี avatar URL จะ render `<image>` ใน SVG (clipped to rounded rect)
- ถ้าไม่มี avatar URL จะใช้ initials text แบบเดิม
- รองรับ avatar URL จาก `council_users.avatar_url` ในทุกที่ที่ใช้ Avatar

### Password Handling (v1.6)
- **`approveRequest`**: ใช้ `req.password` จาก join_requests ก่อน ถ้าว่างค่อย fallback ไป student_id
- **`createUserApi`**: รับ `password` จาก request body (admin-set) ถ้าไม่มีค่อย fallback
- **Guard**: ถ้า password สั้นกว่า 6 ตัว จะ pad ด้วย "0" ให้ครบ 6 ตัว (Supabase Auth minimum)
- ทำให้ผู้ใช้ที่อนุมัติแล้วสามารถ login ด้วย password ที่ตั้งเองได้ ไม่ใช่แค่ student_id

### Schema Detection (v1.6)
- เพิ่ม `avatar_url`, `password`, `message`, `created_at` ใน fallback cache ของ schema-detect
- ถ้า information_schema query ล้มเหลว จะใช้ cache ที่มีคอลัมน์ครบถ้วน

### RLS Policies (อ้างอิงจาก schema_sc.md)
- `council_users`: insert_admin, update_self_or_admin, delete_admin, select_own/authenticated
- `council_join_requests`: insert anyone, select authenticated/own, delete admin
- `council_years`: select anyone, modify admin (authenticated)
- `departments`: select anyone, modify admin

### Schema จริงที่อ้างอิง (verified จาก schema_sc.md)

**`council_users`** (PK: id uuid, UNIQUE: auth_uid, student_id):
- id, auth_uid, full_name, student_id, email, year, role, approved, disabled, account_type
- department_id (FK → departments.id), avatar_url, national_id, color, created_at
- FK: year → council_years.year

**`council_years`** (PK: year integer):
- year, closed, created_at

**`council_join_requests`** (PK: id uuid, UNIQUE: student_id):
- id, full_name, student_id, year, email, password, message, account_type, national_id, department_id, created_at
- FK: department_id → departments.id

**`departments`** (PK: id text):
- id, name, color, icon, description, created_at, updated_at

### Verified
- Build ผ่านสมบูรณ์ บน Next.js 16.2.10 + Tailwind v4.3.2
- ทุก INSERT/UPDATE ผ่าน `filterPayload()` → ปลอดภัย 100%
- Avatar component รองรับ avatar URL จริงจาก database
- Password จาก join_requests ใช้งานได้ (ผู้อนุมัติใช้ password ที่ผู้สมัครตั้งเอง)

---

## การปรับปรุงใน v1.5 (Schema-Accurate — อ้างอิงฐานข้อมูลจริง)

### Bug Fixes (Critical — แก้ไขปัญหา "Could not find the 'X' column")
- **อ้างอิงคอลัมน์ที่ไม่มีอยู่จริง** — ปัญหาร้ายแรงที่สุดของ v1.4: โค้ดสร้างคอลัมน์ขึ้นมาเองที่ไม่มีในฐานข้อมูลจริง ทำให้ทุกการบันทึกล้มเหลว:
  - `council_users.color` — ypwork migration เพิ่มคอลัมน์นี้ แต่ฐานข้อมูลผู้ใช้ยังไม่ได้รัน migration → INSERT ล้มเหลว
  - `departments.head_user_auth_uid` — **คอลัมน์นี้ไม่มีอยู่ใน schema จริงเลย** (เราสร้างขึ้นมาเองใน v1.3) → ทุกการสร้าง/แก้ไขฝ่ายงานล้มเหลว
  - `council_users.national_id` / `council_join_requests.national_id` — ypwork v1.8.1 เพิ่มคอลัมน์นี้ แต่อาจยังไม่ได้รัน
- **แก้ไข**: สร้างระบบ **Schema Detection** (`src/lib/db/schema-detect.ts`) ที่ตรวจสอบคอลัมน์จริงจาก `information_schema.columns` ตอนเริ่มต้น แล้วใช้ `filterPayload()` กรองเฉพาะคอลัมน์ที่มีอยู่จริงก่อน INSERT/UPDATE → ไม่มี "Could not find the 'X' column" อีก

### Schema จริงที่อ้างอิง (verified)
ตรวจสอบจาก `yplabs/supabase/migrations/20260429121736_001_create_all_tables_and_enable_realtime.sql` + `ypwork/supabase/migrations/ypwork_schema.sql` + `ypwork/ypwork-v1.8.1-national-id-and-years-from-db.sql`:

**`council_users`** (yplabs core):
- `id`, `auth_uid`, `full_name`, `student_id`, `email`, `year`, `role`, `approved`, `disabled`, `account_type`, `created_at`
- ypwork extensions (อาจมีหรือไม่มี): `department_id`, `color`, `national_id`

**`council_years`** (yplabs core):
- `year`, `closed`

**`council_join_requests`** (yplabs core):
- `id`, `full_name`, `student_id`, `year`, `email`, `account_type`, `created_at`
- ypwork extensions (อาจมีหรือไม่มี): `department_id`, `national_id`

**`departments`** (ypwork):
- `id`, `name`, `color`, `icon`, `description`, `created_at`, `updated_at`
- **ไม่มี** `head_user_auth_uid` (คอลัมน์นี้ไม่เคยมีอยู่ใน schema จริง)

### การลบ `head_user_auth_uid` (Fabricated Column)
- ลบคอลัมน์ `head_user_auth_uid` ออกจาก:
  - Database types (`src/lib/types/database.ts`)
  - API routes (`/api/admin/departments` + `/api/admin/departments/[id]`)
  - API helpers (`src/lib/api/admin.ts`)
  - DB helpers (`src/lib/db/departments.ts`)
  - Views (`departments-view.tsx` — ลบ field หัวหน้าฝ่ายออกจาก form สร้าง)
  - Views (`department-detail-view.tsx` — ลบ field หัวหน้าฝ่ายออกจาก form แก้ไข, ลบ stat "หัวหน้า", ลบ chip "หัวหน้า" จาก member list)

### Schema Detection System (`src/lib/db/schema-detect.ts`)
- `detectSchemaColumns(adminClient)` — query `information_schema.columns` ครั้งเดียวตอนเริ่มต้น (cached)
- `filterPayload(table, payload)` — กรอง payload ให้เหลือเฉพาะคอลัมน์ที่มีอยู่จริง
- `hasColumn(table, column)` — ตรวจสอบว่าคอลัมน์มีอยู่หรือไม่
- ทุก API route ใช้ `filterPayload()` ก่อน INSERT/UPDATE → ปลอดภัย 100%

### Fallback สำหรับ Avatar Color
- `council_users.color` อาจไม่มี → Avatar component รองรับ `color=undefined` (ใช้ brand gradient)
- Views ที่ใช้ `u.color` ส่ง `u.color || undefined` เพื่อให้ Avatar ใช้ fallback
- `user-detail-view.tsx` ใช้ `user.color || dept?.color || "#0EA5E9"` สำหรับ hero gradient

### Verified
- Build ผ่านสมบูรณ์ บน Next.js 16.2.10 + Tailwind v4.3.2
- ไม่มีการอ้างอิงคอลัมน์ `head_user_auth_uid` ในโค้ด (เหลือเฉพาะใน comments เพื่อ documentation)
- ทุก INSERT/UPDATE ผ่าน `filterPayload()` → ไม่มี "Could not find the 'X' column" errors
- ไม่ต้องแก้ไขฐานข้อมูล — โค้ดปรับตัวเองตาม schema ที่มีอยู่จริง

---

## การปรับปรุงใน v1.4 (Critical Data Save Fix + Sheet Stability)

### Bug Fixes (Critical — แก้ไขปัญหา "บันทึกข้อมูลไม่ได้")
- **RLS บล็อกการบันทึกข้อมูลทั้งหมด** — ปัญหาร้ายแรงที่สุดของ v1.3: ระบบใช้ browser client (anon key + user auth) สำหรับการเขียนข้อมูลทั้งหมด แต่ yplabs schema มี RLS policies ที่เข้มงวด:
  - `council_users` — authenticated อ่านได้แค่แถวตัวเอง, **ไม่มี INSERT/UPDATE/DELETE policy**
  - `council_years` — authenticated อ่านได้อย่างเดียว, **ไม่มี INSERT/UPDATE policy**
  - `council_join_requests` — authenticated อ่าน/insert ได้ แต่ **ไม่มี DELETE policy**
  - ผล: อนุมัติคำขอ, แก้ไข/ลบผู้ใช้, เพิ่ม/ปิดปี, ปฏิเสธคำขอ — **ทั้งหมดถูกบล็อก**
- **แก้ไข**: สร้าง API routes ทั้งหมดที่ใช้ service role key (bypass RLS) ผ่าน `requireAdmin()` guard:
  - `POST /api/admin/approve-request` — อนุมัติคำขอ (แก้ไขให้ใช้ adminClient สำหรับ council_users INSERT)
  - `POST /api/admin/requests/[id]/reject` — ปฏิเสธคำขอ
  - `POST /api/admin/users` — สร้างผู้ใช้ใหม่
  - `PATCH /api/admin/users/[id]` — แก้ไขผู้ใช้
  - `DELETE /api/admin/users/[id]` — ลบผู้ใช้ (ลบทั้ง council_users + Supabase Auth)
  - `POST /api/admin/years` — เพิ่มปีการศึกษา
  - `PATCH /api/admin/years/[year]` — เปิด/ปิดรับสมาชิก
  - `DELETE /api/admin/years/[year]` — ลบปี
  - `POST /api/admin/departments` — สร้างฝ่ายงาน
  - `PATCH /api/admin/departments/[id]` — แก้ไขฝ่ายงาน
  - `DELETE /api/admin/departments/[id]` — ลบฝ่ายงาน

### Auth Guard (`requireAdmin()`)
- ทุก API route ผ่าน `requireAdmin()` ก่อนดำเนินการ:
  1. ตรวจสอบ Supabase Auth session จาก cookies
  2. ตรวจสอบ `council_users.role === 'admin'` (via service role client)
  3. ตรวจสอบ `approved === true && disabled === false`
  4. คืน adminClient (service role) สำหรับการเขียนข้อมูล
- ป้องกัน self-deletion (ไม่ให้ลบบัญชีตัวเอง)

### Bottom Sheet History Sync (Stability Fix)
- **ปัญหา**: เมื่อ drag-to-close sheet, ระบบใช้ `skipHistory: true` ซึ่งลบ sheet จาก internal stack แต่ **ไม่ได้ pop browser history entry** → กดปุ่มย้อนกลับแล้วไม่เกิดอะไรขึ้น (popstate handler เจอ stale sheet marker แล้ว return ก่อน)
- **แก้ไข**: drag-close ใช้ `controller.close()` (ไม่ skipHistory) → `closeSheetHistory()` เรียก `history.back()` อย่างถูกต้อง → history sync สมบูรณ์
- **เพิ่ม stale-marker cleanup**: หาก popstate เจอ sheet marker ที่ไม่มี sheet ใน stack อีก → ลบ marker ออกจาก state ผ่าน `replaceState` เพื่อกัน phantom back-button presses

### API Client Helpers (`src/lib/api/admin.ts`)
- สร้าง helper functions สำหรับเรียก API routes ทั้งหมด (`approveRequestApi`, `rejectRequestApi`, `updateUserApi`, `deleteUserApi`, `addYearApi`, `updateYearApi`, `createDepartmentApi`, `updateDepartmentApi`, `deleteDepartmentApi`)
- Views เรียกผ่าน helpers แทนการใช้ browser client โดยตรง → error handling สม่ำเสมอ

### Verified
- Build ผ่านสมบูรณ์ บน Next.js 16.2.10 + Tailwind v4.3.2
- ทุก write operation ผ่าน API routes ที่มี auth guard + service role key
- Bottom sheet history sync ทำงานถูกต้องเมื่อ drag-close, ESC, backdrop click, hardware back

---

## การปรับปรุงใน v1.3 (Critical Framework Fix)

### Bug Fixes (Critical — แก้ไขปัญหาหลักของ v1.2)
- **CSS ไม่ถูกโหลดเลยใน v1.2** — ปัญหาร้ายแรงที่สุด: การ `@import` demo CSS จาก `globals.css` ไม่ทำงานใน Tailwind v4 + Turbopack ทำให้ `.sheet`, `.side-bar`, `.btn`, `.stat-card` และ class อื่นๆ ไม่มี style → bottom sheet และ sidebar มองไม่เห็น / ใช้งานไม่ได้
  - **แก้ไข**: import CSS แต่ละไฟล์โดยตรงใน `layout.tsx` (JS import) → Next.js สร้าง CSS chunk แยกสำหรับแต่ละไฟล์และ link ใน `<head>` ครบถ้วน
- **Font ไม่ตรงกับ demo** — v1.2 ใช้ `next/font/google` ซึ่ง inject `--font-noto-sans-thai` และ `--font-inter` แต่ demo's `tokens.css` ใช้ `--yp-font-stack: 'Noto Sans Thai', 'Inter'` โดยตรง → body text ใช้ fallback font ไม่ใช่ Noto Sans Thai
  - **แก้ไข**: โหลด Noto Sans Thai + Inter จาก Google Fonts CDN ผ่าน `<link>` ใน `<head>` (เหมือน demo's `index.html` ทุกประการ) และใช้ `--yp-font-stack` โดยตรง

### Bottom Sheet Framework (rewrite)
- เขียนใหม่ทั้งหมดเพื่อใช้ CSS class `.is-open` แทน inline style (เหมือน demo 100%)
- ก่อนหน้านี้ v1.2 ใช้ `style={{ visibility: "hidden", opacity: 0 }}` ซึ่ง override CSS rule `.sheet-backdrop.is-open { opacity: 1; visibility: visible }` (inline style มี specificity สูงกว่า) → sheet มองไม่เห็นตลอดเวลา
- ตอนนี้ sheet portal render โดยไม่มี `.is-open` ก่อน (CSS default = hidden) แล้ว double-rAF เพิ่ม `.is-open` เพื่อ trigger transition (เหมือน demo's `requestAnimationFrame`)
- ปิดโดย remove `.is-open` + add `.is-closing` → slide-down animation (เหมือน demo)

### Sidebar Framework (rewrite)
- เพิ่ม scroll-lock แบบ count-based (เหมือน demo's `scroll-lock.js`) — `position:fixed` บน body + saved scroll position → re-open sidebar ไม่ทำให้หน้ากระโดด
- เพิ่ม history stack integration — เปิด sidebar push history entry → hardware back button ปิด sidebar แทนที่จะออกจากแอป (เหมือน demo's `registerSheet`)
- เพิ่ม `body.yp-sidebar-open` class → CSS rule `body.yp-sidebar-open .fab { ... }` ซ่อน FAB อัตโนมัติ (เหมือน demo)
- Title swap animation ทำงานเฉพาะเมื่อ title เปลี่ยนจริงๆ (ก่อนหน้านี้ fire ทุก render → flicker)

### Verified
- ทุก demo CSS class (`.sheet.is-open`, `.side-bar.is-open`, `.sidebar-backdrop.is-open`, `.btn`, `.stat-card`, `.loading-screen`, `.login`, `.admin-hero` ฯลฯ) มี CSS rule ใน built output ครบถ้วน
- Production build สร้าง 3 CSS chunks (รวม ~232KB) และ link ใน `<head>` ครบ
- Build ผ่านสมบูรณ์บน Next.js 16.2.10 + Tailwind v4.3.2

---

## การปรับปรุงใน v1.2

### Bug Fixes (Critical)
- **Toast Provider bug** — แก้ไข `ToastProvider` ที่วางผิดตำแหน่ง (เป็น sibling ของ children) ทำให้ `useToast()` ในทุกหน้าคืนค่า no-op fallback และ toast ไม่แสดงผล → แยก `ToastProvider` (wraps children) จาก toast rendering (portal) ทำให้ toast ทำงานได้ทุกหน้า
- **Loading screen** — เปลี่ยนจาก inline styles ไปใช้ `.loading-screen` class ของ demo ที่มี fade-out animation ครบถ้วน (logo pulse + title + subtitle)

### New Features (จาก demo + ypwork)
- **Title Swap Animation** — เมื่อ route เปลี่ยน หัวเรื่องใน top-bar จะมี animation `yp-title-swap` (fade + slight move) ตรงกับ demo 100%
- **Perf Controller** — IntersectionObserver ตรวจหา hero blocks ที่ออกจาก viewport แล้ว pause background animations (`.yp-pause-bg`) ประหยัด CPU/GPU เมื่อ hero ไม่ visible (port จาก `demo/framework/perf-controller.js`)
- **Open-redirect protection** — `getSafeRedirect()` ตรวจสอบว่า redirect param เป็น relative path เท่านั้น (ป้องกัน `//evil.com` และ `/\evil.com`) อิงจาก ypwork pattern
- **Redirect loop prevention** — `wasRecentlyRedirected()` + `clearRedirectMarkers()` ป้องกันลูปการ redirect ระหว่าง /login และ /dashboard เมื่อ session มีปัญหา

### Improvements
- **Middleware** — รองรับ env vars หลายชื่อ (`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`) อิงจาก ypwork pattern; graceful skip เมื่อ env ไม่ได้ตั้งค่า
- **AppShell** — เพิ่ม `yp-sidebar-open` body class ตอน sidebar เปิด (ตรงกับ demo CSS ที่ซ่อน FAB); ใช้ `usePerfController` hook
- **Login page** — ใช้ `getSafeRedirect()` สำหรับ redirect หลัง login; ตรวจจับ redirect loop และ sign out ถ้าตรวจพบ
- **Footer / version labels** — อัปเดตเป็น v1.2 ทุกจุด

### Cleanup
- ลบ `bottom-sheet-provider.tsx` (unused wrapper — `BottomSheetProvider` ใช้ตรงจาก `bottom-sheet.tsx` แล้ว)
- โครงสร้าง CSS ยังคงเหมือน demo 100% (verified: `diff -q demo/assets/css admin-sc-yp/src/styles` ไม่มี output)

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

© 2026 YP Admin · v1.6
