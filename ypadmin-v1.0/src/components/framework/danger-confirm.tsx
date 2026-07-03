"use client";

/**
 * Danger Zone safety system (port from ypadmin-demo-v1.5 danger-confirm.js)
 *
 * 2-step destructive confirmation:
 *  Step 1: Warning + Acknowledge button → step 2 (if requireText)
 *  Step 2: Type-to-confirm input + Final action button (disabled until typed correctly)
 *
 * 1-step confirmDangerousAction for less severe actions (reject request, disable user).
 */
import React, { useEffect, useRef, useState } from "react";
import { useBottomSheet } from "./bottom-sheet";
import {
  AlertIcon,
  InfoIcon,
  ShieldIcon,
  CheckIcon,
  CloseIcon,
} from "@/lib/icons";

export interface ConfirmDestructiveOptions {
  title?: string;
  message?: string;
  impact?: string[];
  confirmText?: string;
  requireText?: string | null;
  requireHint?: string;
  finalAction?: string;
  finalActionIcon?: React.ReactNode;
  entityName?: string;
}

export function useDangerConfirm() {
  const { open } = useBottomSheet();

  const confirmDestructive = React.useCallback(
    (opts: ConfirmDestructiveOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        let resolved = false;
        const done = (val: boolean) => {
          if (resolved) return;
          resolved = true;
          controller.close();
          resolve(val);
        };

        const body = (
          <DangerZoneStep1
            opts={opts}
            onAcknowledge={() => {
              if (!opts.requireText) {
                done(true);
                return;
              }
              // Render step 2 — but since we use a static body, we need to
              // re-open. Simpler: render step 2 inside the same body via state.
              // The current implementation uses uncontrolled state in Step1Body.
              // We patch the sheet body by replacing controller.patch — but our
              // BottomSheet doesn't expose patch reliably. So we re-render via
              // a key change.
              controller.close({ skipHistory: true });
              const step2Controller = open({
                title: "⚠️ โซนอันตราย",
                body: (
                  <DangerZoneStep2 opts={opts} onConfirm={() => done(true)} />
                ),
                footer: null,
                dismissable: true,
                onClose: () => done(false),
              });
              // Track step2Controller for cancellation
              void step2Controller;
            }}
          />
        );

        const controller = open({
          title: "⚠️ โซนอันตราย",
          body,
          footer: null,
          dismissable: true,
          onClose: () => done(false),
        });
      });
    },
    [open]
  );

  const confirmDangerousAction = React.useCallback(
    (opts: {
      title?: string;
      message?: string;
      impact?: string[];
      confirmText?: string;
      finalActionIcon?: React.ReactNode;
    }): Promise<boolean> => {
      return new Promise((resolve) => {
        let resolved = false;
        const done = (val: boolean) => {
          if (resolved) return;
          resolved = true;
          controller.close();
          resolve(val);
        };

        const body = (
          <div className="danger-zone danger-zone--simple">
            <div className="danger-zone__hero danger-zone__hero--simple">
              <div className="danger-zone__hero-icon danger-zone__hero-icon--warning">
                <AlertIcon size={24} />
              </div>
              <div className="danger-zone__hero-body">
                <div className="danger-zone__hero-title">{opts.title || "ยืนยันการดำเนินการ"}</div>
                {opts.message && (
                  <div className="danger-zone__hero-msg">{opts.message}</div>
                )}
              </div>
            </div>
            {opts.impact && opts.impact.length > 0 && (
              <div className="danger-zone__impact">
                <div className="danger-zone__impact-label">ผลกระทบ</div>
                <ul className="danger-zone__impact-list">
                  {opts.impact.map((i, idx) => (
                    <li key={idx}>{i}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

        const footer = (
          <div className="danger-zone__footer">
            <button
              className="btn btn--ghost btn--block"
              onClick={() => done(false)}
            >
              ยกเลิก
            </button>
            <button
              className="btn btn--danger-outline btn--block"
              onClick={() => done(true)}
            >
              {opts.finalActionIcon || <AlertIcon size={16} />}
              <span>{opts.confirmText || "ยืนยัน"}</span>
            </button>
          </div>
        );

        const controller = open({
          title: "ยืนยันการดำเนินการ",
          body,
          footer,
          dismissable: true,
          onClose: () => done(false),
        });
      });
    },
    [open]
  );

  return { confirmDestructive, confirmDangerousAction };
}

/* ── Step 1 body ── */
function DangerZoneStep1({
  opts,
  onAcknowledge,
}: {
  opts: ConfirmDestructiveOptions;
  onAcknowledge: () => void;
}) {
  return (
    <div className="danger-zone">
      <div className="danger-zone__hero">
        <div className="danger-zone__hero-icon">
          <AlertIcon size={24} />
        </div>
        <div className="danger-zone__hero-body">
          <div className="danger-zone__hero-title">
            {opts.title || "การกระทำนี้ไม่สามารถย้อนกลับได้"}
          </div>
          {opts.message && (
            <div className="danger-zone__hero-msg">{opts.message}</div>
          )}
        </div>
      </div>

      {opts.impact && opts.impact.length > 0 && (
        <div className="danger-zone__impact">
          <div className="danger-zone__impact-label">ผลกระทบที่จะเกิดขึ้น</div>
          <ul className="danger-zone__impact-list">
            {opts.impact.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
        </div>
      )}

      {opts.entityName && (
        <div className="danger-zone__entity">
          <span className="danger-zone__entity-label">เป้าหมาย:</span>
          <span className="danger-zone__entity-name">{opts.entityName}</span>
        </div>
      )}

      <div className="danger-zone__hint">
        <InfoIcon size={16} />
        <span>
          โปรดตรวจสอบให้แน่ใจก่อนดำเนินการ — การกระทำนี้
          <strong>ย้อนกลับไม่ได้</strong>
        </span>
      </div>

      <div className="danger-zone__footer">
        <AcknowledgeFooter
          confirmText={opts.confirmText || "ดำเนินการต่อ"}
          onAcknowledge={onAcknowledge}
        />
      </div>
    </div>
  );
}

function AcknowledgeFooter({
  confirmText,
  onAcknowledge,
}: {
  confirmText: string;
  onAcknowledge: () => void;
}) {
  const { open } = useBottomSheet();
  // The footer is rendered inside the body here because our BottomSheet
  // puts footer in a separate slot. To keep semantics, we render the
  // buttons inline and call onAcknowledge.
  return (
    <>
      <style>{`
        .danger-zone__footer {
          display: flex;
          gap: 10px;
          margin-top: 20px;
        }
      `}</style>
      <button
        className="btn btn--ghost btn--block"
        onClick={() => {
          // Close current sheet — caller will resolve false via onClose
          // We need to close the controller. Since we don't have direct access,
          // dispatch Escape — BottomSheet history manager will close top sheet.
          document.dispatchEvent(
            new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
          );
        }}
      >
        ยกเลิก
      </button>
      <button
        className="btn btn--danger-outline btn--block"
        onClick={onAcknowledge}
      >
        <AlertIcon size={16} />
        <span>{confirmText}</span>
      </button>
    </>
  );
}

/* ── Step 2 body (type-to-confirm) ── */
function DangerZoneStep2({
  opts,
  onConfirm,
}: {
  opts: ConfirmDestructiveOptions;
  onConfirm: () => void;
}) {
  const [value, setValue] = useState("");
  const matches =
    value.trim().toLowerCase() === (opts.requireText || "").toLowerCase();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 280);
  }, []);

  return (
    <div className="danger-zone">
      <div className="danger-zone__step2-intro">
        <div className="danger-zone__step2-icon">
          <ShieldIcon size={24} />
        </div>
        <div className="danger-zone__step2-text">
          เพื่อยืนยันว่าคุณเข้าใจผลกระทบ โปรดพิมพ์ข้อความด้านล่างให้ถูกต้อง
        </div>
      </div>

      <div className="danger-zone__type-confirm">
        <label className="danger-zone__type-label">
          {opts.requireHint || `พิมพ์ "${opts.requireText}" เพื่อยืนยัน`}
        </label>
        <div className="danger-zone__type-input-wrap">
          <input
            ref={inputRef}
            type="text"
            className="danger-zone__type-input"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="พิมพ์ชื่อยืนยัน…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div
            className={`danger-zone__type-status ${
              matches ? "is-match" : value.length > 0 ? "is-mismatch" : ""
            }`}
          >
            {matches ? (
              <>
                <CheckIcon size={14} /> ถูกต้อง — สามารถกดปุ่มด้านล่างได้
              </>
            ) : value.length > 0 ? (
              <>
                <CloseIcon size={14} /> ยังไม่ตรง — ต้องพิมพ์ให้ตรงทุกตัวอักษร
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="danger-zone__footer">
        <button
          className="btn btn--ghost btn--block"
          onClick={() =>
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
            )
          }
        >
          ยกเลิก
        </button>
        <button
          className="btn btn--danger btn--block"
          disabled={!matches}
          onClick={onConfirm}
        >
          {opts.finalActionIcon || <AlertIcon size={16} />}
          <span>{opts.finalAction || "ยืนยันการดำเนินการ"}</span>
        </button>
      </div>
    </div>
  );
}
