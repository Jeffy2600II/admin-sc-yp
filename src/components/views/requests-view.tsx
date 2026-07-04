"use client";

import { useEffect, useState, useCallback } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/framework/avatar";
import {
  PageHeader,
  PendingAlert,
  EmptyState,
  RequestCard,
  Chip,
  Button,
  SheetActions,
} from "@/components/ui-blocks";
import { useBottomSheet } from "@/components/framework/bottom-sheet";
import { useDangerConfirm } from "@/components/framework/danger-confirm";
import { useToast } from "@/components/framework/toast-provider";
import { getRequests } from "@/lib/db/requests";
import {
  formatDateTime,
  maskNationalId,
  accountTypeLabel,
  accountTypeIcon,
} from "@/lib/utils/format";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from "@/lib/icons";
import type { CouncilJoinRequest } from "@/lib/types/database";

const TYPE_COLORS: Record<string, string> = {
  student: "#0EA5E9",
  teacher: "#06B6D4",
  other: "#F59E0B",
};

interface RequestsViewProps {
  /** Optional: requestId to auto-open detail sheet for (used by request-detail-view). */
  autoOpenRequestId?: string;
  /** Optional: child content rendered before the list (not used here, kept for parity). */
  children?: React.ReactNode;
}

export function RequestsView({ autoOpenRequestId }: RequestsViewProps) {
  const { open } = useBottomSheet();
  const { confirmDangerousAction } = useDangerConfirm();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<CouncilJoinRequest[]>([]);

  const fetchData = useCallback(async () => {
    const supabase = getBrowserClient();
    const r = await getRequests(supabase);
    setRequests(r);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-open detail sheet on mount if autoOpenRequestId is passed
  useEffect(() => {
    if (!autoOpenRequestId) return;
    const t = setTimeout(() => {
      const r = requests.find((x) => x.id === autoOpenRequestId);
      if (r) {
        openRequestDetailSheet(r);
      }
    }, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenRequestId, requests]);

  const handleApprove = async (
    req: CouncilJoinRequest,
    afterAction?: () => void
  ) => {
    try {
      const response = await fetch("/api/admin/approve-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: req.id }),
      });
      const result = await response.json();
      if (!result.success) {
        toast(result.error || "ไม่สามารถอนุมัติคำขอได้", "error");
        return;
      }
      toast(
        `อนุมัติ "${req.full_name}" เรียบร้อย — สร้างบัญชีใหม่ในระบบ`,
        "success"
      );
      afterAction?.();
      fetchData();
    } catch (err) {
      console.error("[approveRequest]", err);
      toast("เกิดข้อผิดพลาดในการอนุมัติคำขอ", "error");
    }
  };

  const handleReject = async (
    req: CouncilJoinRequest,
    afterAction?: () => void
  ) => {
    const confirmed = await confirmDangerousAction({
      title: `ปฏิเสธคำขอของ ${req.full_name}`,
      message: `คำขอนี้จะถูกลบออกจากระบบ`,
      impact: [
        `คำขอของ "${req.full_name}" จะถูกลบถาวร`,
        `${req.full_name} จะต้องส่งคำขอใหม่อีกครั้งถ้าต้องการเข้าร่วม`,
        "ข้อมูลที่กรอกไว้จะไม่ถูกเก็บไว้",
      ],
      confirmText: "ปฏิเสธและลบคำขอ",
      finalActionIcon: <XCircleIcon size={16} />,
    });
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/admin/requests/${req.id}/reject`, {
        method: "POST",
      });
      const result = await response.json();
      if (!result.success) {
        toast(result.error || "ไม่สามารถปฏิเสธคำขอได้", "error");
        return;
      }
      toast(`ปฏิเสธคำขอของ "${req.full_name}" เรียบร้อย`, "info");
      afterAction?.();
      fetchData();
    } catch (err) {
      console.error("[rejectRequest]", err);
      toast("เกิดข้อผิดพลาดในการปฏิเสธคำขอ", "error");
    }
  };

  const openRequestDetailSheet = (req: CouncilJoinRequest) => {
    const color = TYPE_COLORS[req.account_type] || "#0EA5E9";

    const controller = open({
      title: "รายละเอียดคำขอ",
      size: "tall",
      body: (
        <div className="request-detail">
          <div
            className="request-detail__hero"
            style={{
              background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 60%, #06B6D4) 100%)`,
            }}
          >
            <div className="request-detail__avatar">
              <Avatar name={req.full_name} color={color} size={80} />
            </div>
            <div className="request-detail__name">{req.full_name}</div>
            <div className="request-detail__type">
              <span
                className="chip"
                style={{
                  background: "rgba(255,255,255,0.22)",
                  color: "white",
                  borderColor: "rgba(255,255,255,0.30)",
                }}
              >
                {accountTypeIcon(req.account_type)}{" "}
                {accountTypeLabel(req.account_type)}
              </span>
              <span
                className="chip"
                style={{
                  background: "rgba(255,255,255,0.22)",
                  color: "white",
                  borderColor: "rgba(255,255,255,0.30)",
                }}
              >
                รอพิจารณา
              </span>
            </div>
          </div>

          <div className="request-detail__info">
            {req.student_id && (
              <div className="request-detail__row">
                <div className="request-detail__row-icon">🎓</div>
                <div className="request-detail__row-label">รหัสนักเรียน</div>
                <div
                  className="request-detail__row-value"
                  style={{ fontFamily: "var(--yp-font-mono)" }}
                >
                  {req.student_id}
                </div>
              </div>
            )}
            {req.national_id && (
              <div className="request-detail__row">
                <div className="request-detail__row-icon">🪪</div>
                <div className="request-detail__row-label">เลขบัตรประชาชน</div>
                <div
                  className="request-detail__row-value"
                  style={{ fontFamily: "var(--yp-font-mono)" }}
                >
                  {maskNationalId(req.national_id)}
                </div>
              </div>
            )}
            {req.email && (
              <div className="request-detail__row">
                <div className="request-detail__row-icon">📧</div>
                <div className="request-detail__row-label">อีเมล</div>
                <div className="request-detail__row-value">{req.email}</div>
              </div>
            )}
            {req.year ? (
              <div className="request-detail__row">
                <div className="request-detail__row-icon">📅</div>
                <div className="request-detail__row-label">ปีการศึกษา</div>
                <div className="request-detail__row-value">{req.year}</div>
              </div>
            ) : null}
            <div className="request-detail__row">
              <div className="request-detail__row-icon">⏰</div>
              <div className="request-detail__row-label">ส่งเมื่อ</div>
              <div className="request-detail__row-value">
                {formatDateTime(req.created_at)}
              </div>
            </div>
          </div>

          {req.message && (
            <div className="request-detail__message">
              <div className="request-detail__message-label">
                ข้อความจากผู้สมัคร
              </div>
              <div className="request-detail__message-body">
                &ldquo;{req.message}&rdquo;
              </div>
            </div>
          )}
        </div>
      ),
      footer: (
        <SheetActions>
          <Button
            variant="ghost"
            block
            style={{
              color: "#BE123C",
              borderColor: "rgba(244, 63, 94, 0.30)",
            }}
            onClick={async () => {
              controller.close();
              await handleReject(req);
            }}
          >
            <XCircleIcon size={16} /> ปฏิเสธ
          </Button>
          <Button
            variant="primary"
            block
            onClick={() => {
              controller.close();
              handleApprove(req);
            }}
          >
            <CheckCircleIcon size={16} /> อนุมัติ
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
        <div className="skeleton" style={{ height: 120 }} />
      </div>
    );
  }

  return (
    <div className="page container">
      <PageHeader
        eyebrow="คำขอสมัครสมาชิก"
        title={`รอพิจารณา ${requests.length} รายการ`}
        subtitle="ตรวจสอบและอนุมัติคำขอเข้าร่วมสภานักเรียน"
      />

      {requests.length > 0 && (
        <PendingAlert
          icon={<ClockIcon size={22} />}
          title={`รอพิจารณา ${requests.length} รายการ`}
          desc="กรุณาตรวจสอบและดำเนินการด้านล่าง"
        />
      )}

      {requests.length === 0 ? (
        <EmptyState
          icon="✅"
          title="ไม่มีคำขอรอพิจารณา"
          desc="คำขอทั้งหมดได้รับการพิจารณาแล้ว"
        />
      ) : (
        requests.map((r, idx) => {
          const color = TYPE_COLORS[r.account_type] || "#0EA5E9";
          return (
            <RequestCard
              key={r.id}
              color={color}
              avatar={<Avatar name={r.full_name} color={color} size={44} />}
              title={
                <>
                  {r.full_name}
                  <Chip
                    style={{ fontSize: 11, marginLeft: 6 }}
                  >
                    {accountTypeIcon(r.account_type)}{" "}
                    {accountTypeLabel(r.account_type)}
                  </Chip>
                </>
              }
              subtitle={
                <>
                  {r.student_id && (
                    <span>
                      🎓{" "}
                      <strong style={{ fontFamily: "var(--yp-font-mono)" }}>
                        {r.student_id}
                      </strong>
                    </span>
                  )}
                  {r.national_id && (
                    <span>
                      🪪{" "}
                      <strong style={{ fontFamily: "var(--yp-font-mono)" }}>
                        {maskNationalId(r.national_id)}
                      </strong>
                    </span>
                  )}
                  {r.email && <span>📧 {r.email}</span>}
                  {r.year ? <span>📅 ปี {r.year}</span> : null}
                </>
              }
              message={r.message || undefined}
              time={formatDateTime(r.created_at)}
              onApprove={() => handleApprove(r)}
              onReject={() => handleReject(r)}
              onOpenDetail={() => openRequestDetailSheet(r)}
              animationDelay={idx * 40}
            />
          );
        })
      )}
    </div>
  );
}
