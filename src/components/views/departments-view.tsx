"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import {
  PageHeader,
  EmptyState,
  DeptCard,
  Button,
  Input,
  Textarea,
  Field,
  Select,
  ColorPicker,
  IconPicker,
  SheetActions,
  FormSection,
} from "@/components/ui-blocks";
import { useBottomSheet } from "@/components/framework/bottom-sheet";
import { useToast } from "@/components/framework/toast-provider";
import { getDepartments } from "@/lib/db/departments";
import { createDepartmentApi } from "@/lib/api/admin";
import type { CouncilUser, Department } from "@/lib/types/database";

export const DEPT_COLORS = [
  "#0EA5E9",
  "#06B6D4",
  "#0284C7",
  "#0891B2",
  "#6366F1",
  "#8B5CF6",
  "#A855F7",
  "#EC4899",
  "#F59E0B",
  "#EF4444",
  "#22D3EE",
  "#3B82F6",
];

export const DEPT_ICONS = [
  "👥",
  "🎨",
  "📚",
  "📋",
  "💰",
  "📢",
  "🎤",
  "🎭",
  "🏆",
  "🎯",
  "✨",
  "🌟",
  "💡",
  "🔧",
];

export function DepartmentsView() {
  const router = useRouter();
  const { open } = useBottomSheet();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<CouncilUser[]>([]);

  const fetchData = useCallback(async () => {
    const supabase = getBrowserClient();
    const [d, u] = await Promise.all([
      getDepartments(supabase),
      supabase
        .from("council_users")
        .select("id, full_name, department_id, role, auth_uid")
        .then(
          ({ data }) =>
            (data as Pick<
              CouncilUser,
              "id" | "full_name" | "department_id" | "role" | "auth_uid"
            >[]) || []
        ),
    ]);
    setDepartments(d);
    setUsers(u as CouncilUser[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for FAB "ypadmin-fab" event to open create department modal
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === "departments") {
        openCreateDepartmentModal();
      }
    };
    window.addEventListener("ypadmin-fab", handler);
    return () => window.removeEventListener("ypadmin-fab", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departments, users]);

  const openCreateDepartmentModal = () => {
    let name = "";
    let description = "";
    let icon = DEPT_ICONS[0];
    let color = DEPT_COLORS[0];
    // v1.5: headUid removed — head_user_auth_uid column doesn't exist

    const controller = open({
      title: "เพิ่มฝ่ายงานใหม่",
      size: "tall",
      body: (
        <FormSection>
          <Field label="ชื่อฝ่ายงาน" htmlFor="dept-name">
            <Input
              id="dept-name"
              type="text"
              placeholder="เช่น ฝ่ายกิจกรรม"
              onChange={(e) => {
                name = e.target.value;
              }}
            />
          </Field>
          <Field label="คำอธิบาย" htmlFor="dept-desc">
            <Textarea
              id="dept-desc"
              rows={3}
              placeholder="อธิบายหน้าที่ของฝ่ายนี้"
              onChange={(e) => {
                description = e.target.value;
              }}
            />
          </Field>
          <Field label="ไอคอน">
            <IconPicker
              icons={DEPT_ICONS}
              value={icon}
              onChange={(ic) => {
                icon = ic;
              }}
            />
          </Field>
          <Field label="สีของฝ่าย">
            <ColorPicker
              colors={DEPT_COLORS}
              value={color}
              onChange={(c) => {
                color = c;
              }}
            />
          </Field>
        </FormSection>
      ),
      footer: (
        <SheetActions>
          <Button
            variant="ghost"
            block
            onClick={() => controller.close()}
          >
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            block
            onClick={async () => {
              const trimmedName = name.trim();
              if (!trimmedName) {
                toast("กรุณากรอกชื่อฝ่ายงาน", "error");
                return;
              }
              const result = await createDepartmentApi({
                name: trimmedName,
                description: description.trim(),
                icon,
                color,
              });
              if (!result.success) {
                toast(result.error || "ไม่สามารถเพิ่มฝ่ายงานได้", "error");
                return;
              }
              toast(`เพิ่มฝ่าย "${trimmedName}" เรียบร้อย`, "success");
              controller.close();
              fetchData();
            }}
          >
            เพิ่มฝ่าย
          </Button>
        </SheetActions>
      ),
    });
  };

  if (loading) {
    return (
      <div className="page container" style={{ padding: "80px 20px" }}>
        <div className="skeleton" style={{ height: 100, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 80, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 80, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 80 }} />
      </div>
    );
  }

  return (
    <div className="page container">
      <PageHeader
        eyebrow="ฝ่ายงาน"
        title="จัดการฝ่ายงาน"
        subtitle={`${departments.length} ฝ่ายงานในระบบ — แตะเพื่อดูรายละเอียดหรือแก้ไข`}
      />

      {departments.length === 0 ? (
        <EmptyState
          icon="🏢"
          title="ยังไม่มีฝ่ายงาน"
          desc="กดปุ่ม + เพื่อเพิ่มฝ่ายงานแรก"
        />
      ) : (
        <div
          className="action-grid"
          style={{ gridTemplateColumns: "1fr" }}
        >
          {departments.map((d, idx) => {
            const memberCount = users.filter(
              (u) => u.department_id === d.id
            ).length;
            // v1.5: head_user_auth_uid doesn't exist — show member count only
            return (
              <DeptCard
                key={d.id}
                icon={d.icon}
                name={d.name}
                desc={d.description || "ไม่มีคำอธิบาย"}
                meta={
                  <>
                    <span>{memberCount} สมาชิก</span>
                  </>
                }
                color={d.color}
                onClick={() => router.push(`/departments/${d.id}`)}
                animationDelay={idx * 40}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
