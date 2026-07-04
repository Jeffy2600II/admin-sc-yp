"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import {
  PageHeader,
  SectionLabel,
  InfoCard,
  YearCard,
  EmptyState,
  Button,
  Input,
  Field,
  SheetActions,
  FormSection,
} from "@/components/ui-blocks";
import { useBottomSheet } from "@/components/framework/bottom-sheet";
import { useDangerConfirm } from "@/components/framework/danger-confirm";
import { useToast } from "@/components/framework/toast-provider";
import {
  getYears,
  MAX_RETAINED,
} from "@/lib/db/years";
import {
  addYearApi,
  updateYearApi,
} from "@/lib/api/admin";
import {
  BanIcon,
  CheckCircleIcon,
  InfoIcon,
} from "@/lib/icons";
import type { CouncilYear, CouncilUser } from "@/lib/types/database";

export function YearsView() {
  const { open } = useBottomSheet();
  const { confirmDangerousAction } = useDangerConfirm();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<CouncilYear[]>([]);
  const [users, setUsers] = useState<CouncilUser[]>([]);
  const valueRef = useRef("");

  const fetchData = useCallback(async () => {
    const supabase = getBrowserClient();
    const [y, u] = await Promise.all([
      getYears(supabase),
      supabase
        .from("council_users")
        .select("id, year")
        .then(({ data }) => (data as Pick<CouncilUser, "id" | "year">[]) || []),
    ]);
    setYears(y);
    setUsers(u as CouncilUser[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openCreateYearModal = useCallback(() => {
    valueRef.current = "";

    const controller = open({
      title: "เพิ่มปีการศึกษาใหม่",
      size: "auto",
      body: (
        <FormSection>
          <Field
            label="ปีการศึกษา (พ.ศ. ย่อ เช่น 69)"
            htmlFor="year-input"
          >
            <Input
              id="year-input"
              type="tel"
              inputMode="numeric"
              placeholder="69"
              maxLength={2}
              onChange={(e) => {
                valueRef.current = e.target.value;
              }}
            />
          </Field>
          <p
            style={{
              fontSize: "var(--yp-text-xs)",
              color: "var(--yp-text-muted)",
              lineHeight: 1.6,
              marginTop: 8,
            }}
          >
            <InfoIcon size={14} /> ระบบจะเก็บข้อมูลสูงสุด{" "}
            <strong>3 ปีล่าสุด</strong> ปีที่เก่ากว่าจะถูก archive โดยอัตโนมัติ
          </p>
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
              const trimmed = valueRef.current.trim();
              if (!trimmed) {
                toast("กรุณากรอกปีการศึกษา", "error");
                return;
              }
              const result = await addYearApi(Number(trimmed));
              if (!result.success) {
                toast(result.error || "ไม่สามารถเพิ่มปีได้", "error");
                return;
              }
              toast(`เพิ่มปี ${trimmed} เรียบร้อย`, "success");
              controller.close();
              fetchData();
            }}
          >
            เพิ่มปี
          </Button>
        </SheetActions>
      ),
    });
  }, [open, toast, fetchData]);

  // Listen for FAB "ypadmin-fab" event to open create year modal
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === "years") {
        openCreateYearModal();
      }
    };
    window.addEventListener("ypadmin-fab", handler);
    return () => window.removeEventListener("ypadmin-fab", handler);
  }, [openCreateYearModal]);

  const handleToggle = async (yr: CouncilYear) => {
    if (!yr.closed) {
      // Closing — confirm
      const confirmed = await confirmDangerousAction({
        title: `ปิดรับสมาชิกปี ${yr.year}`,
        message: `หลังจากปิดรับแล้ว จะไม่สามารถเพิ่มสมาชิกใหม่ในปี ${yr.year} ได้`,
        impact: [
          `สมาชิกใหม่จะไม่สามารถถูกเพิ่มในปี ${yr.year} ได้อีก`,
          `สมาชิกปัจจุบันในปี ${yr.year} ยังคงอยู่ — ข้อมูลไม่หาย`,
          "สามารถเปิดรับใหม่ได้ภายหลัง",
        ],
        confirmText: `ปิดรับสมาชิกปี ${yr.year}`,
        finalActionIcon: <BanIcon size={16} />,
      });
      if (!confirmed) return;
    } else {
      // Opening — confirm
      const confirmed = await confirmDangerousAction({
        title: `เปิดรับสมาชิกปี ${yr.year}`,
        message: `หลังจากเปิดรับแล้ว จะสามารถเพิ่มสมาชิกใหม่ในปี ${yr.year} ได้อีกครั้ง`,
        impact: [
          `สมาชิกใหม่สามารถถูกเพิ่มในปี ${yr.year} ได้`,
          `สมาชิกปัจจุบันในปี ${yr.year} ยังคงอยู่ — ข้อมูลไม่เปลี่ยนแปลง`,
          "สามารถปิดรับใหม่ได้ภายหลัง",
        ],
        confirmText: `เปิดรับสมาชิกปี ${yr.year}`,
        finalActionIcon: <CheckCircleIcon size={16} />,
      });
      if (!confirmed) return;
    }

    const result = await updateYearApi(yr.year, { closed: !yr.closed });
    if (!result.success) {
      toast(result.error || "ไม่สามารถเปลี่ยนสถานะปีได้", "error");
      return;
    }
    toast(`${yr.closed ? "เปิด" : "ปิด"}รับสมาชิกปี ${yr.year} เรียบร้อย`, "info");
    fetchData();
  };

  if (loading) {
    return (
      <div className="page container" style={{ padding: "80px 20px" }}>
        <div className="skeleton" style={{ height: 100, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 120, marginBottom: 20 }} />
        <div className="skeleton" style={{ height: 80 }} />
      </div>
    );
  }

  const retainedYears = years.slice(0, MAX_RETAINED).map((y) => y.year);

  return (
    <div className="page container">
      <PageHeader
        eyebrow="ปีการศึกษา"
        title="จัดการปีการศึกษา"
        subtitle={
          <>
            ระบบเก็บข้อมูลสมาชิกไว้ <strong>{MAX_RETAINED} ปีล่าสุด</strong> เท่านั้น
          </>
        }
      />

      <InfoCard
        title="ℹ️ ระบบเก็บข้อมูลยังไง?"
        body={
          <>
            ระบบจะเก็บข้อมูลสมาชิก (รายชื่อ, ฝ่ายงาน) ของ{" "}
            <strong>{MAX_RETAINED} ปีล่าสุด</strong> ไว้เสมอ ปีที่เก่ากว่านั้นจะถูก{" "}
            <strong>archive</strong> — ข้อมูลยังอยู่ในฐานข้อมูล แต่จะไม่แสดงในระบบปกติ
          </>
        }
        slots={
          years.length === 0 ? (
            <span
              style={{
                fontSize: "var(--yp-text-sm)",
                color: "var(--yp-text-faint)",
              }}
            >
              ยังไม่มีปีการศึกษา
            </span>
          ) : (
            years.map((y, i) => {
              const slotClass =
                i === 0
                  ? "info-card__slot--current"
                  : i < MAX_RETAINED
                  ? "info-card__slot--retained"
                  : "info-card__slot--archive";
              const slotLabel =
                i === 0
                  ? "ปีปัจจุบัน"
                  : i < MAX_RETAINED
                  ? `ย้อนหลัง ${i} ปี`
                  : "จะถูก archive";
              return (
                <div
                  key={y.year}
                  className={`info-card__slot ${slotClass}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {i === 0 ? "⭐" : ""} ปี {y.year}
                  <span className="info-card__slot-label">{slotLabel}</span>
                </div>
              );
            })
          )
        }
      />

      {years.length > MAX_RETAINED && (
        <div
          style={{
            marginTop: 10,
            fontSize: "var(--yp-text-xs)",
            color: "#BE123C",
          }}
        >
          ⚠️ มีปีที่เกินโควต้า — ข้อมูลปีเก่าจะหายจากระบบ
        </div>
      )}

      <SectionLabel>ปีทั้งหมดในระบบ ({years.length})</SectionLabel>

      {years.length === 0 ? (
        <EmptyState
          icon="📅"
          title="ยังไม่มีปีการศึกษา"
          desc="กดปุ่ม + ด้านล่างขวาเพื่อเพิ่มปีแรก"
        />
      ) : (
        years.map((y, i) => {
          const isRetained = retainedYears.includes(y.year);
          const isCurrent = i === 0;
          const yearUsers = users.filter((u) => u.year === y.year);
          const slotColor = isCurrent
            ? "#B45309"
            : isRetained
            ? "#0369A1"
            : "#BE123C";
          const slotLabel = isCurrent
            ? "ปีปัจจุบัน"
            : isRetained
            ? `ย้อนหลัง ${i} ปี (ยังเก็บอยู่)`
            : "เกิน 3 ปี — จะถูก archive";

          return (
            <YearCard
              key={y.year}
              year={y.year}
              closed={y.closed}
              isCurrent={isCurrent}
              isRetained={isRetained}
              slotLabel={slotLabel}
              slotColor={slotColor}
              memberCount={yearUsers.length}
              onToggle={() => handleToggle(y)}
              animationDelay={i * 40}
            />
          );
        })
      )}
    </div>
  );
}
