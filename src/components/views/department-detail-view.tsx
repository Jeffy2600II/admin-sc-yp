"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/framework/avatar";
import {
  AdminHero,
  SectionLabel,
  SettingsList,
  SettingsItem,
  StatsGrid,
  StatCard,
  DataList,
  Chip,
  EmptyState,
  UserItem,
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
import { useDangerConfirm } from "@/components/framework/danger-confirm";
import { useToast } from "@/components/framework/toast-provider";
import {
  getDepartmentById,
} from "@/lib/db/departments";
import {
  updateDepartmentApi,
  deleteDepartmentApi,
} from "@/lib/api/admin";
import { roleLabel } from "@/lib/utils/format";
import {
  EditIcon,
  TrashIcon,
  StarIcon,
} from "@/lib/icons";
import type { CouncilUser, Department } from "@/lib/types/database";

const DEPT_COLORS = [
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

const DEPT_ICONS = [
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

interface DepartmentDetailViewProps {
  deptId: string;
}

export function DepartmentDetailView({ deptId }: DepartmentDetailViewProps) {
  const router = useRouter();
  const { open } = useBottomSheet();
  const { confirmDestructive, confirmDangerousAction } = useDangerConfirm();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [dept, setDept] = useState<Department | null>(null);
  const [members, setMembers] = useState<CouncilUser[]>([]);
  const [allUsers, setAllUsers] = useState<CouncilUser[]>([]);

  const fetchData = useCallback(async () => {
    const supabase = getBrowserClient();
    const [d, m, u] = await Promise.all([
      getDepartmentById(supabase, deptId),
      supabase
        .from("council_users")
        .select("*")
        .eq("department_id", deptId)
        .order("created_at", { ascending: false })
        .then(({ data }) => (data as CouncilUser[]) || []),
      supabase
        .from("council_users")
        .select("*")
        .order("full_name", { ascending: true })
        .then(({ data }) => (data as CouncilUser[]) || []),
    ]);
    setDept(d);
    setMembers(m);
    setAllUsers(u);
    setLoading(false);
  }, [deptId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEditModal = () => {
    if (!dept) return;
    let name = dept.name;
    let description = dept.description || "";
    let icon = dept.icon;
    let color = dept.color;
    let headUid = dept.head_user_auth_uid || "";

    const controller = open({
      title: "แก้ไขฝ่ายงาน",
      size: "tall",
      body: (
        <FormSection>
          <Field label="ชื่อฝ่ายงาน" htmlFor="dept-name">
            <Input
              id="dept-name"
              type="text"
              defaultValue={dept.name}
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
              defaultValue={dept.description || ""}
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
          <Field label="หัวหน้าฝ่าย" htmlFor="dept-head">
            <Select
              id="dept-head"
              defaultValue={headUid}
              onChange={(e) => {
                headUid = e.target.value;
              }}
            >
              <option value="">— ไม่ระบุ —</option>
              {allUsers.map((u) => (
                <option key={u.id} value={u.auth_uid || ""}>
                  {u.full_name} ({u.student_id || u.email || "—"})
                </option>
              ))}
            </Select>
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
              const result = await updateDepartmentApi(deptId, {
                name: trimmedName,
                description: description.trim(),
                icon,
                color,
                headUserAuthUid: headUid || null,
              });
              if (!result.success) {
                toast(result.error || "ไม่สามารถบันทึกฝ่ายงานได้", "error");
                return;
              }
              toast(`บันทึกฝ่าย "${trimmedName}" เรียบร้อย`, "success");
              controller.close();
              fetchData();
            }}
          >
            บันทึก
          </Button>
        </SheetActions>
      ),
    });
  };

  const handleDelete = async () => {
    if (!dept) return;

    // Check members first
    if (members.length > 0) {
      await confirmDangerousAction({
        title: "ไม่สามารถลบฝ่ายนี้ได้",
        message: `ฝ่าย "${dept.name}" ยังมีสมาชิกอยู่ ${members.length} คน — ต้องย้ายสมาชิกออกก่อน`,
        impact: [
          `สมาชิก ${members.length} คน ยังคงอยู่ในฝ่ายนี้`,
          "ต้องเปลี่ยนฝ่ายให้สมาชิกทุกคนก่อนจึงจะลบได้",
        ],
        confirmText: "ฉันเข้าใจ",
        finalActionIcon: <InfoIconInline />,
      });
      return;
    }

    // 2-step type-to-confirm — must type dept name
    const confirmed = await confirmDestructive({
      title: `ลบฝ่ายงาน "${dept.name}"`,
      message: "การลบนี้ไม่สามารถย้อนกลับได้",
      impact: [
        `ฝ่าย "${dept.name}" จะถูกลบออกจากระบบถาวร`,
        "ข้อมูลประวัติและการตั้งค่าฝ่ายจะหายไปทันที",
        "การกระทำนี้ย้อนกลับไม่ได้ — ต้องสร้างฝ่ายใหม่ถ้าต้องการใช้อีกครั้ง",
      ],
      confirmText: "ฉันเข้าใจผลกระทบ",
      requireText: dept.name,
      requireHint: `พิมพ์ "${dept.name}" เพื่อยืนยันการลบ`,
      finalAction: "ลบฝ่ายงานถาวร",
      finalActionIcon: <TrashIcon size={16} />,
      entityName: dept.name,
    });
    if (!confirmed) return;

    const result = await deleteDepartmentApi(deptId);
    if (!result.success) {
      toast(result.error || "ไม่สามารถลบฝ่ายงานได้", "error");
      return;
    }
    toast(`ลบฝ่าย "${dept.name}" เรียบร้อย`, "success");
    router.push("/departments");
  };

  if (loading) {
    return (
      <div className="page container" style={{ padding: "80px 20px" }}>
        <div className="skeleton" style={{ height: 200, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 80, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 100 }} />
      </div>
    );
  }

  if (!dept) {
    return (
      <div className="page container">
        <EmptyState icon="🔍" title="ไม่พบฝ่ายงาน" />
      </div>
    );
  }

  const admins = members.filter((m) => m.role === "admin").length;
  const disabled = members.filter((m) => m.disabled).length;
  const hasHead = !!dept.head_user_auth_uid;

  const heroStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${dept.color} 0%, color-mix(in srgb, ${dept.color} 60%, #06B6D4) 100%)`,
  };

  return (
    <div className="page container">
      <AdminHero style={heroStyle} name={dept.name}>
        <div className="admin-hero__content">
          <div className="admin-hero__greeting">
            {dept.icon} ฝ่ายงาน
          </div>
          <div className="admin-hero__name">{dept.name}</div>
          <div className="admin-hero__date">
            {dept.description || "ไม่มีคำอธิบาย"}
          </div>
          <div className="admin-hero__stats">
            <div className="admin-hero__stat">
              <div className="admin-hero__stat-value">{members.length}</div>
              <div className="admin-hero__stat-label">สมาชิก</div>
            </div>
            <div className="admin-hero__stat">
              <div className="admin-hero__stat-value">{admins}</div>
              <div className="admin-hero__stat-label">แอดมิน</div>
            </div>
            <div className="admin-hero__stat">
              <div className="admin-hero__stat-value">{disabled}</div>
              <div className="admin-hero__stat-label">ปิดบัญชี</div>
            </div>
            <div className="admin-hero__stat">
              <div className="admin-hero__stat-value">{hasHead ? 1 : 0}</div>
              <div className="admin-hero__stat-label">หัวหน้า</div>
            </div>
          </div>
        </div>
      </AdminHero>

      <SectionLabel>การจัดการ</SectionLabel>
      <div style={{ marginBottom: "var(--yp-space-5)" }}>
        <SettingsList>
          <SettingsItem
            icon={<EditIcon size={20} />}
            title="แก้ไขข้อมูลฝ่าย"
            subtitle="ชื่อ คำอธิบาย สี ไอคอน"
            chevron
            onClick={openEditModal}
          />
          <SettingsItem
            icon={<TrashIcon size={20} />}
            title="ลบฝ่ายงาน"
            subtitle="ลบถาวร — ต้องไม่มีสมาชิกอยู่ในฝ่าย"
            danger
            chevron
            onClick={handleDelete}
          />
        </SettingsList>
      </div>

      <SectionLabel>สมาชิกในฝ่าย ({members.length})</SectionLabel>
      {members.length === 0 ? (
        <EmptyState
          icon="👥"
          title="ยังไม่มีสมาชิก"
          desc="เพิ่มสมาชิกใหม่ได้จากหน้าบัญชีผู้ใช้"
        />
      ) : (
        <DataList
          title={dept.name}
          count={<Chip>{members.length} คน</Chip>}
        >
          {members.map((u, idx) => {
            const isHead = u.auth_uid === dept.head_user_auth_uid;
            return (
              <UserItem
                key={u.id}
                avatar={<Avatar name={u.full_name} color={u.color} size={40} />}
                title={
                  <>
                    {u.full_name}
                    {u.role === "admin" && (
                      <span
                        style={{
                          color: "var(--yp-cyan-600)",
                          fontSize: "12px",
                          marginLeft: "4px",
                          verticalAlign: "middle",
                        }}
                      >
                        <StarIcon size={12} />
                      </span>
                    )}
                    {isHead && (
                      <Chip
                        variant="admin"
                        style={{ fontSize: 10, marginLeft: 6 }}
                      >
                        หัวหน้า
                      </Chip>
                    )}
                  </>
                }
                subtitle={
                  <>
                    <span>{u.student_id || u.email || "—"}</span>
                    <span>·</span>
                    <span>
                      {roleLabel(u.role, u.account_type)}
                    </span>
                  </>
                }
                meta={
                  !u.approved ? (
                    <Chip variant="pending">รอ</Chip>
                  ) : u.disabled ? (
                    <Chip variant="disabled">ปิดแล้ว</Chip>
                  ) : (
                    <Chip variant="approved">ใช้งานได้</Chip>
                  )
                }
                onClick={() => router.push(`/users/${u.id}`)}
                animationDelay={idx * 20}
              />
            );
          })}
        </DataList>
      )}
    </div>
  );
}

/* Small inline icon helper for the cannot-delete warning */
function InfoIconInline() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v.01M12 11v5" />
    </svg>
  );
}
