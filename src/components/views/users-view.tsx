"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/framework/avatar";
import {
  PageHeader,
  SearchBar,
  FilterBar,
  Select,
  StatsGrid,
  StatCard,
  DataList,
  Chip,
  EmptyState,
  UserItem,
} from "@/components/ui-blocks";
import {
  SearchIcon,
  StarIcon,
  UsersIcon,
} from "@/lib/icons";
import type {
  CouncilUser,
  CouncilYear,
  Department,
} from "@/lib/types/database";

export function UsersView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<CouncilUser[]>([]);
  const [years, setYears] = useState<CouncilYear[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [currentYear, setCurrentYear] = useState<CouncilYear | null>(null);

  const [yearFilter, setYearFilter] = useState<number | null>(null);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = getBrowserClient();
      const [u, y, d] = await Promise.all([
        supabase.from("council_users").select("*"),
        supabase.from("council_years").select("*").order("year", { ascending: false }),
        supabase.from("departments").select("*").order("created_at", { ascending: true }),
      ]);
      if (!mounted) return;
      setUsers((u.data as CouncilUser[]) || []);
      const yearsData = (y.data as CouncilYear[]) || [];
      setYears(yearsData);
      setDepartments((d.data as Department[]) || []);
      const cy = yearsData.find((yr) => !yr.closed) || yearsData[0] || null;
      setCurrentYear(cy);
      setYearFilter(cy?.year ?? null);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!users.length) return [];
    let result = users;
    if (yearFilter !== null) result = result.filter((u) => u.year === yearFilter);
    if (roleFilter) result = result.filter((u) => u.role === roleFilter);
    if (statusFilter === "active")
      result = result.filter((u) => u.approved && !u.disabled);
    if (statusFilter === "pending") result = result.filter((u) => !u.approved);
    if (statusFilter === "disabled") result = result.filter((u) => u.disabled);
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          (u.student_id || "").includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [users, yearFilter, roleFilter, statusFilter, search]);

  if (loading) {
    return (
      <div className="page container" style={{ padding: "80px 20px" }}>
        <div className="skeleton" style={{ height: 100, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 60, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 60, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  const stats = [
    { label: "ทั้งหมด", value: filtered.length, color: "var(--yp-sky-500)" },
    {
      label: "แอดมิน",
      value: filtered.filter((u) => u.role === "admin").length,
      color: "var(--yp-cyan-600)",
    },
    {
      label: "ใช้งานได้",
      value: filtered.filter((u) => !u.disabled && u.approved).length,
      color: "#0284C7",
    },
    {
      label: "ปิด/รอ",
      value: filtered.filter((u) => u.disabled || !u.approved).length,
      color: "#F59E0B",
    },
  ];

  return (
    <div className="page container">
      <PageHeader
        eyebrow="บัญชีผู้ใช้"
        title="จัดการบัญชีผู้ใช้"
        subtitle="ดู แก้ไข เปลี่ยนบทบาท และจัดการบัญชีทั้งหมด"
      />

      <FilterBar>
        <Select
          value={yearFilter ?? ""}
          onChange={(e) => setYearFilter(e.target.value ? Number(e.target.value) : null)}
        >
          {years.map((y) => (
            <option key={y.year} value={y.year}>
              ปี {y.year}
            </option>
          ))}
        </Select>
        <Select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">ทุกบทบาท</option>
          <option value="admin">แอดมิน</option>
          <option value="member">สมาชิก</option>
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">ทุกสถานะ</option>
          <option value="active">ใช้งานได้</option>
          <option value="pending">รออนุมัติ</option>
          <option value="disabled">ปิดแล้ว</option>
        </Select>
      </FilterBar>

      <SearchBar
        value={search}
        onChange={setSearch}
        placeholder="ค้นหา ชื่อ / รหัสนักเรียน / email..."
        icon={<SearchIcon size={20} />}
      />

      <StatsGrid>
        {stats.map((s, i) => (
          <StatCard
            key={i}
            label={s.label}
            value={s.value}
            color={s.color}
            animationDelay={i * 30}
          />
        ))}
      </StatsGrid>

      <DataList
        title={`สมาชิก — ปี ${yearFilter ?? "—"}`}
        count={<Chip>{filtered.length} คน</Chip>}
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon="👥"
            title="ไม่พบบัญชีผู้ใช้"
            desc="ลองเปลี่ยนตัวกรองหรือคำค้นหา"
          />
        ) : (
          filtered.map((u, idx) => {
            const dept = departments.find((d) => d.id === u.department_id);
            return (
              <UserItem
                key={u.id}
                avatar={
                  <Avatar
                    name={u.full_name}
                    color={u.color}
                    size={40}
                  />
                }
                title={
                  <>
                    {u.full_name}
                    {u.role === "admin" && (
                      <span
                        style={{
                          color: "var(--yp-cyan-600)",
                          fontSize: "12px",
                          marginLeft: "4px",
                        }}
                      >
                        <StarIcon size={12} />
                      </span>
                    )}
                  </>
                }
                subtitle={
                  <>
                    <span>{u.student_id || u.email || "—"}</span>
                    <span>·</span>
                    <span>{dept ? dept.name : "ไม่มีฝ่าย"}</span>
                  </>
                }
                meta={
                  !u.approved ? (
                    <Chip variant="pending">รอ</Chip>
                  ) : u.disabled ? (
                    <Chip variant="disabled">ปิด</Chip>
                  ) : (
                    <Chip variant="approved">ใช้งานได้</Chip>
                  )
                }
                onClick={() => router.push(`/users/${u.id}`)}
                animationDelay={idx * 20}
              />
            );
          })
        )}
      </DataList>
    </div>
  );
}
