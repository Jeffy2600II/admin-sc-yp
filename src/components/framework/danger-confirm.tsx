"use client";

/**
 * YP ADMIN · DANGER CONFIRM (v1.9 — complete rewrite)
 *
 * 2-step destructive confirmation using a SINGLE bottom sheet with React
 * state for step transitions. This fixes the v1.8 bug where the "confirm"
 * button did nothing because `controller.close()` was called on the wrong
 * controller (step 1's controller, which was already closed when step 2
 * opened).
 *
 * v1.9 design:
 * - Single sheet with `step` state ("warning" | "confirm")
 * - Step 1: warning + "ดำเนินการต่อ" button → setStep("confirm")
 * - Step 2: type-to-confirm input + "ลบถาวร" button (disabled until match)
 * - Cancel/close at any step → resolve(false)
 * - Confirm at step 2 → resolve(true) + close sheet
 *
 * `confirmDangerousAction` (1-step) is kept for less severe actions.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
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

  const confirmDestructive = useCallback(
    (opts: ConfirmDestructiveOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        let resolved = false;

        const done = (val: boolean) => {
          if (resolved) return;
          resolved = true;
          // Close the sheet (without skipHistory so browser back is synced)
          try {
            controller.close();
          } catch (e) {
            // ignore — sheet may already be closing
          }
          resolve(val);
        };

        // v1.9: Single sheet with internal step state.
        // DangerZoneContent manages its own step transitions via React state.
        const body = (
          <DangerZoneContent opts={opts} onConfirm={() => done(true)} onCancel={() => done(false)} />
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

  const confirmDangerousAction = useCallback(
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
          try {
            controller.close();
          } catch (e) {
            // ignore
          }
          resolve(val);
        };

        const body = (
          <div className="danger-zone danger-zone--simple">
            <div className="danger-zone__hero danger-zone__hero--simple">
              <div className="danger-zone__hero-icon danger-zone__hero-icon--warning">
                <AlertIcon size={24} />
              </div>
              <div className="danger-zone__hero-body">
                <div className="danger-zone__hero-title">
                  {opts.title || "ยืนยันการดำเนินการ"}
                </div>
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
          </div>
        );

        const controller = open({
          title: "ยืนยันการดำเนินการ",
          body,
          footer: null,
          dismissable: true,
          onClose: () => done(false),
        });
      });
    },
    [open]
  );

  return { confirmDestructive, confirmDangerousAction };
}

/**
 * v1.9: Single-component danger zone content with internal step state.
 *
 * Step "warning": shows impact + "ดำเนินการต่อ" button (or "ยืนยัน" if no requireText)
 * Step "confirm": shows type-to-confirm input + final action button
 *
 * Both steps have a Cancel button that calls onCancel.
 */
function DangerZoneContent({
  opts,
  onConfirm,
  onCancel,
}: {
  opts: ConfirmDestructiveOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  // v1.9: if no requireText, skip straight to "confirm" (which just shows the button)
  const [step, setStep] = useState<"warning" | "confirm">(
    opts.requireText ? "warning" : "confirm"
  );

  if (step === "warning") {
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
          <button
            className="btn btn--ghost btn--block"
            onClick={onCancel}
          >
            ยกเลิก
          </button>
          <button
            className="btn btn--danger-outline btn--block"
            onClick={() => setStep("confirm")}
          >
            <AlertIcon size={16} />
            <span>{opts.confirmText || "ดำเนินการต่อ"}</span>
          </button>
        </div>
      </div>
    );
  }

  // Step "confirm"
  // If requireText is set, show the type-to-confirm input.
  // If not, show just the final action button (1-step confirm).
  if (opts.requireText) {
    return (
      <DangerZoneTypeConfirm
        opts={opts}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  }

  // No requireText — just show the final action button
  return (
    <div className="danger-zone">
      <div className="danger-zone__hero">
        <div className="danger-zone__hero-icon">
          <AlertIcon size={24} />
        </div>
        <div className="danger-zone__hero-body">
          <div className="danger-zone__hero-title">
            {opts.title || "ยืนยันการดำเนินการ"}
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

      <div className="danger-zone__footer">
        <button
          className="btn btn--ghost btn--block"
          onClick={onCancel}
        >
          ยกเลิก
        </button>
        <button
          className="btn btn--danger btn--block"
          onClick={onConfirm}
        >
          {opts.finalActionIcon || <AlertIcon size={16} />}
          <span>{opts.finalAction || "ยืนยันการดำเนินการ"}</span>
        </button>
      </div>
    </div>
  );
}

/**
 * Step 2: type-to-confirm input + final action button.
 * v1.9: Cancel button calls onCancel directly (no more dispatchEvent hack).
 */
function DangerZoneTypeConfirm({
  opts,
  onConfirm,
  onCancel,
}: {
  opts: ConfirmDestructiveOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const matches =
    value.trim().toLowerCase() === (opts.requireText || "").toLowerCase();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus the input after the sheet open animation
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  // v1.9: Enter key submits when matches
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && matches) {
      e.preventDefault();
      onConfirm();
    }
  };

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
            onKeyDown={handleKeyDown}
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
          onClick={onCancel}
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
