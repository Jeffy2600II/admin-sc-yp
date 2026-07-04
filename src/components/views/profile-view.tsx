"use client";

import { useEffect, useState, useCallback } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/framework/avatar";
import { useAuth } from "@/components/framework/auth-provider";
import {
  ProfileHero,
  SectionLabel,
  SettingsList,
  SettingsItem,
  Button,
  SheetActions,
} from "@/components/ui-blocks";
import { useBottomSheet } from "@/components/framework/bottom-sheet";
import { useDangerConfirm } from "@/components/framework/danger-confirm";
import { useToast } from "@/components/framework/toast-provider";
import {
  UserIcon,
  ShieldIcon,
  BuildingIcon,
  IdCardIcon,
  MailIcon,
  LogoutIcon,
  InfoIcon,
} from "@/lib/icons";
import { getDepartmentById } from "@/lib/db/departments";
import type { Department } from "@/lib/types/database";

export function ProfileView() {
  const { user, logout } = useAuth();
  const { open } = useBottomSheet();
  const { confirmDangerousAction } = useDangerConfirm();
  const { toast } = useToast();

  const [department, setDepartment] = useState<Department | null>(null);

  const fetchDepartment = useCallback(async () => {
    if (!user?.departmentId) {
      setDepartment(null);
      return;
    }
    const dept = await getDepartmentById(getBrowserClient(), user.departmentId);
    setDepartment(dept);
  }, [user?.departmentId]);

  useEffect(() => {
    fetchDepartment();
  }, [fetchDepartment]);

  if (!user) {
    return (
      <div className="page container" style={{ padding: "80px 20px" }}>
        <div className="skeleton" style={{ height: 200, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 80, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 80 }} />
      </div>
    );
  }

  const openAboutSheet = () => {
    const controller = open({
      title: "เกี่ยวกับระบบ",
      size: "auto",
      body: (
        <div style={{ padding: 4 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                background:
                  "linear-gradient(135deg, #0EA5E9 0%, #06B6D4 100%)",
                color: "white",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              YP
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>YP Admin</div>
              <div style={{ color: "var(--yp-text-muted)", fontSize: 13 }}>
                Student Council Operations Hub
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: "var(--yp-text-body)",
            }}
          >
            <p style={{ margin: "0 0 10px" }}>
              ระบบหลังบ้านสำหรับสภานักเรียน — จัดการฝ่ายงาน
              บัญชีผู้ใช้ ปีการศึกษา และคำขอสมัครสมาชิก
            </p>
            <p style={{ margin: "0 0 10px" }}>
              <InfoIcon size={14} /> ข้อมูลเก็บใน Supabase — รองรับการเข้าสู่ระบบด้วย
              email + password หรือรหัสนักเรียน
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "var(--yp-text-muted)",
              }}
            >
              เวอร์ชัน 1.9.1 · © 2026
            </p>
          </div>
        </div>
      ),
      footer: (
        <SheetActions>
          <Button
            variant="primary"
            block
            onClick={() => controller.close()}
          >
            ปิด
          </Button>
        </SheetActions>
      ),
    });
  };

  const handleLogout = async () => {
    const confirmed = await confirmDangerousAction({
      title: "ออกจากระบบ",
      message: "คุณจะกลับสู่หน้าเข้าสู่ระบบ",
      impact: [
        "เซสชันปัจจุบันจะถูกปิด",
        "ต้องเข้าสู่ระบบใหม่เพื่อใช้งานอีกครั้ง",
      ],
      confirmText: "ออกจากระบบ",
      finalActionIcon: <LogoutIcon size={16} />,
    });
    if (!confirmed) return;
    await logout();
    toast("ออกจากระบบเรียบร้อย", "info");
  };

  return (
    <div className="page container">
      <ProfileHero
        avatar={<Avatar name={user.name} size={104} avatarUrl={user.avatarUrl} />}
        name={user.name}
        role={
          user.role === "admin"
            ? `${user.roleLabel} ⭐`
            : user.roleLabel
        }
      />

      <SectionLabel>บัญชีของฉัน</SectionLabel>
      <div style={{ marginBottom: "var(--yp-space-5)" }}>
        <SettingsList>
          <SettingsItem
            icon={<UserIcon size={20} />}
            title="ชื่อ-นามสกุล"
            subtitle={user.name}
          />
          <SettingsItem
            icon={<ShieldIcon size={20} />}
            title="บทบาท"
            subtitle={
              user.role === "admin" ? "⭐ ผู้ดูแลระบบ" : "สมาชิก"
            }
          />
          <SettingsItem
            icon={<BuildingIcon size={20} />}
            title="ฝ่ายงาน"
            subtitle={department ? department.name : "ไม่มีฝ่าย"}
          />
          {user.accountType === "student" && user.studentCode && (
            <SettingsItem
              icon={<IdCardIcon size={20} />}
              title="รหัสนักเรียน"
              subtitle={user.studentCode}
            />
          )}
          {user.accountType !== "student" && user.email && (
            <SettingsItem
              icon={<MailIcon size={20} />}
              title="อีเมล"
              subtitle={user.email}
            />
          )}
        </SettingsList>
      </div>

      <SectionLabel>การตั้งค่า</SectionLabel>
      <div style={{ marginBottom: "var(--yp-space-5)" }}>
        <SettingsList>
          <SettingsItem
            icon={<InfoIcon size={20} />}
            title="เกี่ยวกับระบบ"
            subtitle="เวอร์ชัน ข้อมูล และลิขสิทธิ์"
            chevron
            onClick={openAboutSheet}
          />
        </SettingsList>
      </div>

      <SectionLabel>เซสชัน</SectionLabel>
      <SettingsList>
        <SettingsItem
          icon={<LogoutIcon size={20} />}
          title="ออกจากระบบ"
          subtitle="กลับสู่หน้าเข้าสู่ระบบ"
          danger
          chevron
          onClick={handleLogout}
        />
      </SettingsList>

      {/* Footer info */}
      <div
        style={{
          textAlign: "center",
          padding: "var(--yp-space-6) 0",
          color: "var(--yp-text-faint)",
          fontSize: "var(--yp-text-xs)",
          lineHeight: 1.7,
        }}
      >
        <div
          style={{
            fontWeight: "var(--yp-fw-bold)",
            color: "var(--yp-text-muted)",
            marginBottom: 4,
          }}
        >
          YP Admin · v1.9.1
        </div>
        <div>Student Council Operations Hub</div>
        <div style={{ marginTop: 6, opacity: 0.7 }}>© 2026</div>
      </div>
    </div>
  );
}
