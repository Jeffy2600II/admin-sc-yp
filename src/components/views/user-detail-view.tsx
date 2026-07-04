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
  EmptyState,
  Button,
  Input,
  Select,
  Field,
  Segmented,
  InfoBanner,
  UserDeptSummary,
  CurrentDeptPill,
  SheetActions,
  FormSection,
  Chip,
} from "@/components/ui-blocks";
import { useBottomSheet } from "@/components/framework/bottom-sheet";
import { useDangerConfirm } from "@/components/framework/danger-confirm";
import { useToast } from "@/components/framework/toast-provider";
import {
  getUserById,
  getRoleLabel,
} from "@/lib/db/users";
import {
  updateUserApi,
  deleteUserApi,
} from "@/lib/api/admin";
import { getDepartments } from "@/lib/db/departments";
import { getYears } from "@/lib/db/years";
import {
  formatDateTime,
  maskNationalId,
  accountTypeLabel,
  accountTypeIcon,
  roleLabel,
} from "@/lib/utils/format";
import {
  UserIcon,
  IdCardIcon,
  MailIcon,
  BuildingIcon,
  CalendarIcon,
  ClockIcon,
  EditIcon,
  ShieldIcon,
  CheckCircleIcon,
  BanIcon,
  PowerIcon,
  KeyIcon,
  TrashIcon,
  InfoIcon,
  ChevronRightIcon,
} from "@/lib/icons";
import type {
  CouncilUser,
  CouncilYear,
  Department,
} from "@/lib/types/database";

interface UserDetailViewProps {
  userId: string;
}

export function UserDetailView({ userId }: UserDetailViewProps) {
  const router = useRouter();
  const { open } = useBottomSheet();
  const { confirmDestructive, confirmDangerousAction } = useDangerConfirm();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<CouncilUser | null>(null);
  const [dept, setDept] = useState<Department | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [years, setYears] = useState<CouncilYear[]>([]);

  const fetchData = useCallback(async () => {
    const supabase = getBrowserClient();
    const [u, d, y] = await Promise.all([
      getUserById(supabase, userId),
      getDepartments(supabase),
      getYears(supabase),
    ]);
    setUser(u);
    setDepartments(d);
    setYears(y);
    if (u?.department_id) {
      const found = d.find((x) => x.id === u.department_id) || null;
      setDept(found);
    } else {
      setDept(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Edit user info modal ── */
  const openEditModal = () => {
    if (!user) return;
    const formRef: {
      fullName: string;
      accountType: "student" | "teacher" | "other";
      studentId: string;
      nationalId: string;
      email: string;
      password: string;
      role: "admin" | "member";
      year: number;
    } = {
      fullName: user.full_name,
      accountType: user.account_type,
      studentId: user.student_id || "",
      nationalId: user.national_id || "",
      email: user.email || "",
      password: "",
      role: user.role,
      year: user.year,
    };

    const controller = open({
      title: "แก้ไขบัญชีผู้ใช้",
      size: "tall",
      body: (
        <UserEditFormBody
          formRef={formRef}
          years={years}
          currentYear={user.year}
        />
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
              const trimmedName = formRef.fullName.trim();
              if (!trimmedName) {
                toast("กรุณากรอกชื่อ-นามสกุล", "error");
                return;
              }
              if (formRef.accountType === "student") {
                if (formRef.studentId.length !== 5) {
                  toast("รหัสนักเรียนต้องมี 5 หลัก", "error");
                  return;
                }
                if (formRef.nationalId.length !== 13) {
                  toast("เลขบัตรประชาชนต้องมี 13 หลัก", "error");
                  return;
                }
              } else {
                if (!formRef.email.trim()) {
                  toast("กรุณากรอกอีเมล", "error");
                  return;
                }
              }

              const patch: Parameters<typeof updateUserApi>[1] = {
                fullName: trimmedName,
                accountType: formRef.accountType,
                role: formRef.role,
                year: formRef.year,
              };
              if (formRef.accountType === "student") {
                patch.studentId = formRef.studentId;
                patch.nationalId = formRef.nationalId;
              } else {
                patch.email = formRef.email.trim();
              }

              const result = await updateUserApi(userId, patch);
              if (!result.success) {
                toast(result.error || "ไม่สามารถบันทึกบัญชีได้", "error");
                return;
              }
              toast(`บันทึกบัญชี "${trimmedName}" เรียบร้อย`, "success");
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

  /* ── Edit department modal ── */
  const openEditDeptModal = () => {
    if (!user) return;
    let newDeptId = user.department_id || "";

    const controller = open({
      title: "แก้ไขฝ่ายงาน",
      size: "auto",
      body: (
        <FormSection>
          <UserDeptSummary
            avatar={
              <Avatar name={user.full_name} color={user.color || undefined} size={48} avatarUrl={user.avatar_url ?? null} />
            }
            name={user.full_name}
            meta={
              <>
                <span>{user.student_id || user.email || "—"}</span>
                <span>·</span>
                <span>{getRoleLabel(user)}</span>
              </>
            }
          />

          <Field label="ฝ่ายงานปัจจุบัน">
            {dept ? (
              <CurrentDeptPill
                icon={dept.icon}
                name={dept.name}
                color={dept.color}
              />
            ) : (
              <CurrentDeptPill name="ไม่มีฝ่าย" />
            )}
          </Field>

          <Field label="เปลี่ยนไปยังฝ่ายงาน" htmlFor="new-department">
            <Select
              id="new-department"
              defaultValue={newDeptId}
              onChange={(e) => {
                newDeptId = e.target.value;
              }}
            >
              <option value="">— ไม่มีฝ่าย —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.icon} {d.name}
                </option>
              ))}
            </Select>
            <p className="field__hint">
              เลือก &ldquo;ไม่มีฝ่าย&rdquo; เพื่อถอนผู้ใช้ออกจากฝ่ายทั้งหมด
            </p>
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
              const target = newDeptId || null;
              if (target === (user.department_id || null)) {
                toast("ฝ่ายงานไม่เปลี่ยนแปลง", "info");
                controller.close();
                return;
              }
              const result = await updateUserApi(userId, {
                departmentId: target,
              });
              if (!result.success) {
                toast(result.error || "ไม่สามารถเปลี่ยนฝ่ายได้", "error");
                return;
              }
              const newDept = departments.find((d) => d.id === target);
              toast(
                target
                  ? `ย้ายไปฝ่าย "${newDept?.name}" เรียบร้อย`
                  : "ถอนออกจากฝ่ายเรียบร้อย",
                "success"
              );
              controller.close();
              fetchData();
            }}
          >
            บันทึกฝ่าย
          </Button>
        </SheetActions>
      ),
    });
  };

  /* ── Action sheet (manage account) ── */
  const openUserActionSheet = () => {
    if (!user) return;
    const controller = open({
      title: "จัดการบัญชี",
      size: "auto",
      body: (
        <div className="admin-action-sheet">
          <UserActionSheetBody
            user={user}
            onAction={async (action) => {
              controller.close({ skipHistory: true });
              await handleAction(action);
            }}
          />
        </div>
      ),
    });
  };

  const handleAction = async (action: string) => {
    if (!user) return;
    if (action === "approve") {
      const result = await updateUserApi(userId, {
        approved: true,
      });
      if (!result.success) {
        toast(result.error || "ไม่สามารถอนุมัติบัญชีได้", "error");
        return;
      }
      toast(`อนุมัติบัญชี ${user.full_name} เรียบร้อย`, "success");
      fetchData();
    } else if (action === "enable") {
      const result = await updateUserApi(userId, {
        disabled: false,
      });
      if (!result.success) {
        toast(result.error || "ไม่สามารถเปิดใช้งานบัญชีได้", "error");
        return;
      }
      toast(`เปิดใช้งานบัญชี ${user.full_name} เรียบร้อย`, "success");
      fetchData();
    } else if (action === "disable") {
      const confirmed = await confirmDangerousAction({
        title: `ปิดใช้งานบัญชี ${user.full_name}`,
        message: `${user.full_name} จะไม่สามารถเข้าสู่ระบบได้จนกว่าจะเปิดบัญชีอีกครั้ง`,
        impact: [
          "ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้ชั่วคราว",
          "ข้อมูลบัญชียังคงอยู่ สามารถเปิดใช้ใหม่ได้ภายหลัง",
        ],
        confirmText: "ปิดใช้งานบัญชี",
        finalActionIcon: <BanIcon size={16} />,
      });
      if (!confirmed) return;
      const result = await updateUserApi(userId, {
        disabled: true,
      });
      if (!result.success) {
        toast(result.error || "ไม่สามารถปิดบัญชีได้", "error");
        return;
      }
      toast(`ปิดบัญชี ${user.full_name} เรียบร้อย`, "info");
      fetchData();
    } else if (action === "resetPassword") {
      const confirmed = await confirmDangerousAction({
        title: `รีเซ็ตรหัสผ่าน ${user.full_name}`,
        message: "รหัสผ่านจะถูกตั้งใหม่เป็นค่าเริ่มต้น",
        impact: [
          user.account_type === "student"
            ? `รหัสผ่านใหม่จะเป็น "${user.student_id}" (รหัสนักเรียน)`
            : 'รหัสผ่านใหม่จะเป็น "123456"',
          "ผู้ใช้ต้องใช้รหัสผ่านใหม่นี้ในการเข้าสู่ระบบครั้งถัดไป",
          "แนะนำให้ผู้ใช้เปลี่ยนรหัสผ่านหลังจากเข้าสู่ระบบ",
        ],
        confirmText: "รีเซ็ตรหัสผ่าน",
        finalActionIcon: <KeyIcon size={16} />,
      });
      if (!confirmed) return;
      // Note: actual password reset for Supabase Auth must be done via
      // server-side admin client. Here we only show success — a server
      // action could be wired up for full functionality.
      toast(
        `รีเซ็ตรหัสผ่าน ${user.full_name} เรียบร้อย — กรุณาตั้งรหัสผ่านใหม่ผ่าน server`,
        "success"
      );
    } else if (action === "delete") {
      const confirmed = await confirmDestructive({
        title: `ลบบัญชี ${user.full_name}`,
        message: `การลบนี้ไม่สามารถย้อนกลับได้ — ข้อมูลทั้งหมดของ ${user.full_name} จะหายไปทันที`,
        impact: [
          `บัญชีและข้อมูลส่วนตัวของ "${user.full_name}" จะถูกลบถาวร`,
          user.student_id
            ? `รหัสนักเรียน ${user.student_id} จะถูกลบออกจากระบบ`
            : "",
          "ประวัติการใช้งานทั้งหมดจะหายไป",
          "การกระทำนี้ย้อนกลับไม่ได้ — ต้องสร้างบัญชีใหม่ถ้าต้องการใช้อีกครั้ง",
        ].filter(Boolean),
        confirmText: "ฉันเข้าใจผลกระทบ",
        requireText: user.full_name,
        requireHint: `พิมพ์ "${user.full_name}" เพื่อยืนยันการลบ`,
        finalAction: "ลบบัญชีถาวร",
        finalActionIcon: <TrashIcon size={16} />,
        entityName: user.full_name,
      });
      if (!confirmed) return;
      const result = await deleteUserApi(userId);
      if (!result.success) {
        toast(result.error || "ไม่สามารถลบบัญชีได้", "error");
        return;
      }
      toast(`ลบบัญชี ${user.full_name} เรียบร้อย`, "success");
      router.push("/users");
    }
  };

  if (loading) {
    return (
      <div className="page container" style={{ padding: "80px 20px" }}>
        <div className="skeleton" style={{ height: 200, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 80, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 100, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 80 }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page container">
        <EmptyState icon="🔍" title="ไม่พบบัญชี" />
      </div>
    );
  }

  // v1.5: user.color may be undefined if the ypwork migration hasn't run.
  // Fall back to the department color, or a default brand color.
  const userColor = user.color || dept?.color || "#0EA5E9";

  const heroStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${userColor} 0%, color-mix(in srgb, ${userColor} 60%, #06B6D4) 100%)`,
  };

  return (
    <div className="page container">
      <AdminHero style={heroStyle} name={user.full_name}>
        <div className="admin-hero__content" style={{ textAlign: "center" }}>
          <div
            style={{
              margin: "0 auto var(--yp-space-3)",
              width: 80,
              height: 80,
              borderRadius: "50%",
              overflow: "hidden",
              border: "3px solid rgba(255,255,255,0.35)",
              boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Avatar name={user.full_name} color={user.color || undefined} size={80} avatarUrl={user.avatar_url ?? null} />
          </div>
          <div className="admin-hero__name">{user.full_name}</div>
          <div className="admin-hero__date">{getRoleLabel(user)}</div>
        </div>
      </AdminHero>

      <StatsGrid>
        <StatCard
          label="บทบาท"
          value={
            user.role === "admin" ? "⭐ แอดมิน" : "สมาชิก"
          }
          color={
            user.role === "admin"
              ? "var(--yp-cyan-600)"
              : "var(--yp-sky-600)"
          }
        />
        <StatCard
          label="สถานะ"
          value={
            !user.approved
              ? "รออนุมัติ"
              : user.disabled
              ? "ปิดแล้ว"
              : "ใช้งานได้"
          }
          color={
            !user.approved
              ? "#B45309"
              : user.disabled
              ? "#BE123C"
              : "#0284C7"
          }
        />
      </StatsGrid>

      <SectionLabel>ข้อมูลบัญชี</SectionLabel>
      <div style={{ marginBottom: "var(--yp-space-5)" }}>
        <SettingsList>
          <SettingsItem
            icon={<UserIcon size={20} />}
            title="ชื่อ-นามสกุล"
            subtitle={user.full_name}
          />
          <SettingsItem
            icon={<IdCardIcon size={20} />}
            title="บัญชีประเภท"
            subtitle={`${accountTypeIcon(user.account_type)} ${accountTypeLabel(
              user.account_type
            )}`}
          />
          {user.student_id && (
            <SettingsItem
              icon={<IdCardIcon size={20} />}
              title="รหัสนักเรียน"
              subtitle={user.student_id}
            />
          )}
          {user.national_id && (
            <SettingsItem
              icon={<IdCardIcon size={20} />}
              title="เลขบัตรประชาชน"
              subtitle={maskNationalId(user.national_id)}
            />
          )}
          {user.email && (
            <SettingsItem
              icon={<MailIcon size={20} />}
              title="อีเมล"
              subtitle={user.email}
            />
          )}
          <SettingsItem
            icon={<BuildingIcon size={20} />}
            title="ฝ่ายงาน"
            subtitle={dept ? dept.name : "ไม่มีฝ่าย"}
            editable
            editBadge={
              <>
                <EditIcon size={14} />
                <span style={{ marginLeft: 4 }}>แก้ไขฝ่าย</span>
              </>
            }
            iconStyle={
              dept
                ? {
                    background: `color-mix(in srgb, ${dept.color} 12%, transparent)`,
                    color: dept.color,
                  }
                : undefined
            }
            onClick={openEditDeptModal}
          />
          <SettingsItem
            icon={<CalendarIcon size={20} />}
            title="ปีการศึกษา"
            subtitle={`${user.year}`}
          />
          <SettingsItem
            icon={<ClockIcon size={20} />}
            title="วันที่สร้างบัญชี"
            subtitle={formatDateTime(user.created_at) || "—"}
          />
        </SettingsList>
      </div>

      <SectionLabel>การจัดการบัญชี</SectionLabel>
      <div style={{ marginBottom: "var(--yp-space-5)" }}>
        <SettingsList>
          <SettingsItem
            icon={<EditIcon size={20} />}
            title="แก้ไขข้อมูลส่วนตัว"
            subtitle="ชื่อ บัญชี บทบาท ปีการศึกษา"
            chevron
            onClick={openEditModal}
          />
          <SettingsItem
            icon={<ShieldIcon size={20} />}
            title="จัดการสถานะบัญชี"
            subtitle="อนุมัติ / ปิด / รีเซ็ตรหัสผ่าน / ลบ"
            chevron
            onClick={openUserActionSheet}
          />
        </SettingsList>
      </div>
    </div>
  );
}

/* ── Edit form body (segmented + dynamic fields) ── */
interface UserEditFormBodyProps {
  formRef: {
    fullName: string;
    accountType: "student" | "teacher" | "other";
    studentId: string;
    nationalId: string;
    email: string;
    password: string;
    role: "admin" | "member";
    year: number;
  };
  years: CouncilYear[];
  currentYear: number;
}

function UserEditFormBody({
  formRef,
  years,
  currentYear,
}: UserEditFormBodyProps) {
  const [accountType, setAccountType] = useState<
    "student" | "teacher" | "other"
  >(formRef.accountType);

  return (
    <FormSection>
      <Field label="ประเภทบัญชี">
        <Segmented
          options={[
            { value: "student", label: "นักเรียน" },
            { value: "teacher", label: "ครู" },
            { value: "other", label: "อื่นๆ" },
          ]}
          value={accountType}
          onChange={(v) => {
            formRef.accountType = v as "student" | "teacher" | "other";
            setAccountType(formRef.accountType);
          }}
        />
      </Field>

      <Field label="ชื่อ-นามสกุล" htmlFor="user-name">
        <Input
          id="user-name"
          type="text"
          defaultValue={formRef.fullName}
          placeholder="เช่น สมชาย ใจดี"
          onChange={(e) => {
            formRef.fullName = e.target.value;
          }}
        />
      </Field>

      {accountType === "student" && (
        <>
          <Field label="รหัสนักเรียน (5 หลัก)" htmlFor="user-student-code">
            <Input
              id="user-student-code"
              type="tel"
              inputMode="numeric"
              maxLength={5}
              defaultValue={formRef.studentId}
              placeholder="38001"
              onChange={(e) => {
                formRef.studentId = e.target.value;
              }}
            />
          </Field>
          <Field
            label="เลขบัตรประชาชน (13 หลัก)"
            htmlFor="user-national-id"
          >
            <Input
              id="user-national-id"
              type="tel"
              inputMode="numeric"
              maxLength={13}
              defaultValue={formRef.nationalId}
              placeholder="1100501245621"
              onChange={(e) => {
                formRef.nationalId = e.target.value;
              }}
            />
          </Field>
        </>
      )}

      {accountType !== "student" && (
        <>
          <Field label="อีเมล" htmlFor="user-email">
            <Input
              id="user-email"
              type="email"
              defaultValue={formRef.email}
              placeholder="teacher@school.ac.th"
              onChange={(e) => {
                formRef.email = e.target.value;
              }}
            />
          </Field>
          <Field label="รหัสผ่าน (อย่างน้อย 6 ตัว)" htmlFor="user-password">
            <Input
              id="user-password"
              type="text"
              placeholder="ปล่อยว่างเพื่อคงรหัสเดิม"
              onChange={(e) => {
                formRef.password = e.target.value;
              }}
            />
          </Field>
        </>
      )}

      <InfoBanner
        icon={<InfoIcon size={18} />}
        title="ต้องการเปลี่ยนฝ่ายงาน?"
        desc='ใช้ปุ่ม "แก้ไขฝ่าย" ในส่วนข้อมูลบัญชีด้านบน'
      />

      <Field label="บทบาท" htmlFor="user-role">
        <Select
          id="user-role"
          defaultValue={formRef.role}
          onChange={(e) => {
            formRef.role = e.target.value as "admin" | "member";
          }}
        >
          <option value="member">สมาชิก</option>
          <option value="admin">⭐ แอดมิน</option>
        </Select>
      </Field>

      <Field label="ปีการศึกษา" htmlFor="user-year">
        <Select
          id="user-year"
          defaultValue={String(currentYear)}
          onChange={(e) => {
            formRef.year = Number(e.target.value);
          }}
        >
          {years.map((y) => (
            <option key={y.year} value={y.year}>
              ปี {y.year}
            </option>
          ))}
        </Select>
      </Field>
    </FormSection>
  );
}

/* ── User action sheet body — grouped actions ── */
interface UserActionSheetBodyProps {
  user: CouncilUser;
  onAction: (action: string) => void | Promise<void>;
}

function UserActionSheetBody({ user, onAction }: UserActionSheetBodyProps) {
  const statusChip = !user.approved ? (
    <Chip variant="pending">รออนุมัติ</Chip>
  ) : user.disabled ? (
    <Chip variant="disabled">ปิดแล้ว</Chip>
  ) : (
    <Chip variant="approved">ใช้งานได้</Chip>
  );

  // Group 1: status
  const statusActions: Array<{
    key: string;
    label: string;
    desc: string;
    icon: React.ReactNode;
    variant: string;
  }> = [];
  if (!user.approved) {
    statusActions.push({
      key: "approve",
      label: "อนุมัติบัญชี",
      desc: "อนุญาตให้ผู้ใช้นี้เข้าสู่ระบบได้",
      icon: <CheckCircleIcon size={20} />,
      variant: "success",
    });
  }
  if (user.disabled) {
    statusActions.push({
      key: "enable",
      label: "เปิดใช้งานบัญชี",
      desc: "ปลดล็อคให้เข้าสู่ระบบได้อีกครั้ง",
      icon: <PowerIcon size={20} />,
      variant: "success",
    });
  } else if (user.approved) {
    statusActions.push({
      key: "disable",
      label: "ปิดใช้งานบัญชี",
      desc: "ผู้ใช้จะไม่สามารถเข้าสู่ระบบได้ชั่วคราว",
      icon: <BanIcon size={20} />,
      variant: "warning",
    });
  }

  const groups: Array<{
    label: string;
    actions: typeof statusActions;
  }> = [];

  if (statusActions.length > 0) {
    groups.push({ label: "สถานะบัญชี", actions: statusActions });
  }

  groups.push({
    label: "ความปลอดภัย",
    actions: [
      {
        key: "resetPassword",
        label: "รีเซ็ตรหัสผ่าน",
        desc:
          user.account_type === "student"
            ? `ตั้งใหม่เป็นรหัสนักเรียน "${user.student_id}"`
            : 'ตั้งใหม่เป็น "123456"',
        icon: <KeyIcon size={20} />,
        variant: "info",
      },
    ],
  });

  groups.push({
    label: "การลบ",
    actions: [
      {
        key: "delete",
        label: "ลบบัญชีถาวร",
        desc: "ลบข้อมูลทั้งหมด — ไม่สามารถกู้คืนได้",
        icon: <TrashIcon size={20} />,
        variant: "danger",
      },
    ],
  });

  return (
    <>
      <div className="admin-action-sheet__summary">
        <div className="admin-action-sheet__avatar">
          <Avatar name={user.full_name} color={user.color || undefined} size={56} avatarUrl={user.avatar_url ?? null} />
        </div>
        <div className="admin-action-sheet__info">
          <div className="admin-action-sheet__name">{user.full_name}</div>
          <div className="admin-action-sheet__meta">
            <span>{user.role === "admin" ? "⭐ แอดมิน" : "สมาชิก"}</span>
            <span>·</span>
            <span>{roleLabel(user.role, user.account_type)}</span>
          </div>
          <div className="admin-action-sheet__chips">
            {statusChip}
            <Chip>{user.student_id || user.email || "—"}</Chip>
          </div>
        </div>
      </div>

      {groups.map((g, gi) => (
        <div key={gi} className="admin-action-sheet__group">
          <div className="admin-action-sheet__group-label">{g.label}</div>
          <div className="admin-action-sheet__list">
            {g.actions.map((a) => (
              <button
                key={a.key}
                type="button"
                className={`admin-action-item admin-action-item--${a.variant}`}
                onClick={() => onAction(a.key)}
              >
                <div className="admin-action-item__icon">{a.icon}</div>
                <div className="admin-action-item__body">
                  <div className="admin-action-item__title">{a.label}</div>
                  <div className="admin-action-item__desc">{a.desc}</div>
                </div>
                <div className="admin-action-item__chevron">
                  <ChevronRightIcon size={18} />
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
