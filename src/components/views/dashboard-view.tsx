"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/framework/avatar";
import { useAuth } from "@/components/framework/auth-provider";
import { useToast } from "@/components/framework/toast-provider";
import {
  AdminHero,
  PendingAlert,
  StatCard,
  StatsGrid,
  ActionCard,
  ActionGrid,
  SectionLabel,
  DataList,
  Chip,
  EmptyState,
} from "@/components/ui-blocks";
import {
  InboxIcon,
  UsersIcon,
  BuildingIcon,
  CalendarIcon,
  ClockIcon,
} from "@/lib/icons";
import { formatDate } from "@/lib/utils/format";
import type {
  CouncilUser,
  CouncilYear,
  CouncilJoinRequest,
  Department,
} from "@/lib/types/database";

export function DashboardView() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<CouncilUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<CouncilYear[]>([]);
  const [requests, setRequests] = useState<CouncilJoinRequest[]>([]);
  const [currentYear, setCurrentYear] = useState<CouncilYear | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = getBrowserClient();
      const [u, d, y, r] = await Promise.all([
        supabase.from("council_users").select("*"),
        supabase.from("departments").select("*"),
        supabase.from("council_years").select("*").order("year", { ascending: false }),
        supabase
          .from("council_join_requests")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);
      if (!mounted) return;
      setUsers((u.data as CouncilUser[]) || []);
      setDepartments((d.data as Department[]) || []);
      setYears((y.data as CouncilYear[]) || []);
      setRequests((r.data as CouncilJoinRequest[]) || []);
      const cy = (y.data as CouncilYear[])?.find((yr) => !yr.closed) || (y.data as CouncilYear[])?.[0] || null;
      setCurrentYear(cy);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading || !user) {
    return (
      <div className="page container" style={{ padding: "80px 20px" }}>
        <div className="skeleton" style={{ height: 200, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 80, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 100 }} />
      </div>
    );
  }

  const currentYearNum = currentYear?.year ?? null;
  const pendingRequests = requests.length;
  const totalUsers = users.filter((u) => u.year === currentYearNum).length;
  const totalAdmins = users.filter(
    (u) => u.role === "admin" && u.year === currentYearNum
  ).length;
  const totalDepartments = departments.length;

  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "สวัสดีตอนเช้า" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น";
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="page container">
      <AdminHero
        greeting={greet}
        name={user.name}
        date={formatDate(todayStr, { long: true })}
        stats={[
          { value: pendingRequests, label: "รอพิจารณา" },
          { value: totalUsers, label: "สมาชิกปีนี้" },
          { value: totalAdmins, label: "แอดมิน" },
          { value: totalDepartments, label: "ฝ่ายงาน" },
        ]}
      />

      {pendingRequests > 0 && (
        <PendingAlert
          href="/requests"
          icon={<ClockIcon size={22} />}
          title="มีคำขอสมัครรอพิจารณา"
          desc={`${pendingRequests} คนรอให้คุณตรวจสอบและอนุมัติ`}
        />
      )}

      <StatsGrid>
        <StatCard
          label="รอพิจารณา"
          value={pendingRequests}
          sub="คำขอสมัครใหม่"
          color="var(--yp-amber-500)"
          animationDelay={0}
        />
        <StatCard
          label="สมาชิกปีนี้"
          value={totalUsers}
          sub={`ปีการศึกษา ${currentYearNum ?? "—"}`}
          color="var(--yp-sky-500)"
          animationDelay={40}
        />
        <StatCard
          label="ปีในระบบ"
          value={years.length}
          sub="เก็บสูงสุด 3 ปีล่าสุด"
          color="var(--yp-cyan-600)"
          animationDelay={80}
        />
        <StatCard
          label="ปีปัจจุบัน"
          value={currentYearNum ?? "—"}
          sub="ปีที่ใช้งานล่าสุด"
          color="var(--yp-amber-500)"
          animationDelay={120}
        />
      </StatsGrid>

      <SectionLabel>เมนูจัดการ</SectionLabel>
      <ActionGrid>
        <ActionCard
          href="/requests"
          icon={<InboxIcon size={22} />}
          title="คำขอสมัครสมาชิก"
          desc="อนุมัติหรือปฏิเสธคำขอที่รอ"
          badge={pendingRequests > 0 ? pendingRequests : undefined}
          badgeUrgent={pendingRequests > 0}
          color="var(--yp-amber-500)"
          animationDelay={0}
        />
        <ActionCard
          href="/users"
          icon={<UsersIcon size={22} />}
          title="จัดการบัญชีผู้ใช้"
          desc="ดู แก้ไข เปลี่ยนบทบาท อนุมัติบัญชี"
          badge={totalUsers > 0 ? totalUsers : undefined}
          color="var(--yp-sky-500)"
          animationDelay={50}
        />
        <ActionCard
          href="/departments"
          icon={<BuildingIcon size={22} />}
          title="จัดการฝ่ายงาน"
          desc="เพิ่ม แก้ไข ลบฝ่ายงานของสภานักเรียน"
          badge={totalDepartments > 0 ? totalDepartments : undefined}
          color="var(--yp-cyan-600)"
          animationDelay={100}
        />
        <ActionCard
          href="/years"
          icon={<CalendarIcon size={22} />}
          title="จัดการปีการศึกษา"
          desc="เพิ่ม/ปิดปี · ดูสถานะการเก็บข้อมูล"
          badge={years.length > 0 ? years.length : undefined}
          color="var(--yp-sky-700)"
          animationDelay={150}
        />
      </ActionGrid>

      {pendingRequests > 0 ? (
        <>
          <SectionLabel>คำขอล่าสุด</SectionLabel>
          <DataList
            title={`รอพิจารณา ${pendingRequests} รายการ`}
            count={<Chip>{pendingRequests} รายการ</Chip>}
            action={<Link href="/requests">ดูทั้งหมด →</Link>}
          >
            {requests.slice(0, 3).map((r) => (
              <div
                key={r.id}
                className="list-item"
                style={{ cursor: "pointer" }}
                onClick={() => router.push(`/requests/${r.id}`)}
              >
                <div
                  className="list-item__icon"
                  style={{
                    background: "rgba(245,158,11,0.10)",
                    color: "#B45309",
                  }}
                >
                  <InboxIcon size={18} />
                </div>
                <div className="list-item__body">
                  <div className="list-item__title">{r.full_name}</div>
                  <div className="list-item__subtitle">
                    {r.account_type === "student"
                      ? "นักเรียน"
                      : r.account_type === "teacher"
                      ? "ครู"
                      : "อื่นๆ"}
                    {r.student_id ? " · " + r.student_id : ""}
                    {r.email ? " · " + r.email : ""}
                  </div>
                </div>
                <div className="list-item__meta">
                  <span className="chip chip--pending">
                    <span className="chip-dot" />
                    รอ
                  </span>
                </div>
              </div>
            ))}
          </DataList>
        </>
      ) : (
        <EmptyState
          icon="✅"
          title="ไม่มีคำขอรอพิจารณา"
          desc="คำขอทั้งหมดได้รับการพิจารณาแล้ว"
          style={{ marginTop: "var(--yp-space-6)" }}
        />
      )}
    </div>
  );
}
