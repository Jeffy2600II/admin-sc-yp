/**
 * Reusable UI primitives — all use the demo's CSS classes
 * (defined in src/styles/components.css and src/styles/pages.css).
 *
 * These thin wrappers give us TypeScript props + React-friendly APIs
 * while keeping the demo's exact visual styles.
 */
import React from "react";
import { cn } from "@/lib/utils/format";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

export function Button({
  variant = "secondary",
  size = "md",
  block = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = cn(
    "btn",
    `btn--${variant}`,
    size === "lg" && "btn--lg",
    size === "sm" && "btn--sm",
    block && "btn--block",
    className
  );
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...rest }: InputProps) {
  return <input className={cn("input", className)} {...rest} />;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function Textarea({ className, ...rest }: TextareaProps) {
  return <textarea className={cn("textarea", className)} {...rest} />;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...rest }: SelectProps) {
  return (
    <select className={cn("select", className)} {...rest}>
      {children}
    </select>
  );
}

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  hasError?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({
  label,
  hint,
  error,
  hasError,
  htmlFor,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("field", hasError && "has-error", className)}>
      {label && (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {hint && <p className="field__hint">{hint}</p>}
      {error && <div className="field__error">{error}</div>}
    </div>
  );
}

type ChipVariant =
  | ""
  | "pending"
  | "approved"
  | "rejected"
  | "disabled"
  | "admin"
  | "member"
  | "teacher"
  | "other";

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
}

export function Chip({ variant = "", className, children, ...rest }: ChipProps) {
  return (
    <span
      className={cn("chip", variant && `chip--${variant}`, className)}
      {...rest}
    >
      {children}
    </span>
  );
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}

export function SearchBar({
  value,
  onChange,
  placeholder,
  icon,
}: SearchBarProps) {
  return (
    <div className="search-bar">
      <span className="search-bar__icon">{icon}</span>
      <input
        className="search-bar__input"
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  desc?: string;
  className?: string;
}

export function EmptyState({ icon, title, desc, className }: EmptyStateProps) {
  return (
    <div className={cn("empty", className)}>
      {icon && <div className="empty__icon">{icon}</div>}
      <div className="empty__title">{title}</div>
      {desc && <div className="empty__desc">{desc}</div>}
    </div>
  );
}

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return <div className={cn("section-label", className)}>{children}</div>;
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, subtitle }: PageHeaderProps) {
  return (
    <div className="page-header">
      {eyebrow && <div className="page-header__eyebrow">{eyebrow}</div>}
      <h1 className="page-header__title">{title}</h1>
      {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
    </div>
  );
}

interface SettingsItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick?: () => void;
  editable?: boolean;
  danger?: boolean;
  editBadge?: React.ReactNode;
  chevron?: boolean;
  iconStyle?: React.CSSProperties;
  className?: string;
  children?: React.ReactNode;
}

export function SettingsItem({
  icon,
  title,
  subtitle,
  onClick,
  editable = false,
  danger = false,
  editBadge,
  chevron = false,
  iconStyle,
  className,
  children,
}: SettingsItemProps) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      className={cn(
        "settings-item",
        editable && "settings-item--editable",
        danger && "settings-item--danger",
        className
      )}
      onClick={onClick}
    >
      <div className="settings-item__icon" style={iconStyle}>
        {icon}
      </div>
      <div className="settings-item__body">
        <div className="settings-item__title">{title}</div>
        {subtitle && <div className="settings-item__subtitle">{subtitle}</div>}
        {children}
      </div>
      {editBadge && <div className="settings-item__edit-badge">{editBadge}</div>}
      {chevron && <div className="settings-item__chevron">›</div>}
    </Comp>
  );
}

interface SettingsListProps {
  children: React.ReactNode;
  className?: string;
}

export function SettingsList({ children, className }: SettingsListProps) {
  return (
    <div className={cn("settings-list", className)}>{children}</div>
  );
}

/** Stat card — small stat tile. */
interface StatCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
  animationDelay?: number;
  className?: string;
}

export function StatCard({
  label,
  value,
  sub,
  color,
  animationDelay,
  className,
}: StatCardProps) {
  const style: React.CSSProperties = {
    "--stat-color": color || "var(--yp-sky-500)",
    ...(animationDelay !== undefined
      ? { animationDelay: `${animationDelay}ms` }
      : {}),
  };
  return (
    <div className={cn("stat-card", className)} style={style}>
      <div className="stat-card__bar" />
      <div className="stat-card__label">{label}</div>
      <div
        className="stat-card__value"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
      {sub && <div className="stat-card__sub">{sub}</div>}
    </div>
  );
}

interface StatsGridProps {
  children: React.ReactNode;
}

export function StatsGrid({ children }: StatsGridProps) {
  return <div className="stats-grid">{children}</div>;
}

/** Action card — main menu card on dashboard. */
interface ActionCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: number;
  badgeUrgent?: boolean;
  color?: string;
  animationDelay?: number;
}

export function ActionCard({
  href,
  icon,
  title,
  desc,
  badge,
  badgeUrgent,
  color,
  animationDelay,
}: ActionCardProps) {
  const style: React.CSSProperties = {
    "--action-color": color || "var(--yp-sky-500)",
    ...(animationDelay !== undefined
      ? { animationDelay: `${animationDelay}ms` }
      : {}),
  };
  return (
    <a href={href} className="action-card" style={style}>
      <div className="action-card__header">
        <div className="action-card__icon">{icon}</div>
      </div>
      <div className="action-card__body">
        <div className="action-card__title">{title}</div>
        <div className="action-card__desc">{desc}</div>
      </div>
      {badge !== undefined && badge > 0 && (
        <div
          className={`action-card__badge ${
            badgeUrgent ? "action-card__badge--urgent" : ""
          }`}
        >
          {badge}
        </div>
      )}
      <div className="action-card__arrow">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </a>
  );
}

interface ActionGridProps {
  children: React.ReactNode;
}

export function ActionGrid({ children }: ActionGridProps) {
  return <div className="action-grid">{children}</div>;
}

/** Pending alert banner. */
interface PendingAlertProps {
  href?: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick?: () => void;
}

export function PendingAlert({
  href,
  icon,
  title,
  desc,
  onClick,
}: PendingAlertProps) {
  if (href) {
    return (
      <a href={href} className="pending-alert">
        <div className="pending-alert__icon">{icon}</div>
        <div className="pending-alert__body">
          <div className="pending-alert__title">{title}</div>
          <div className="pending-alert__desc">{desc}</div>
        </div>
        <div className="pending-alert__action">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </div>
      </a>
    );
  }
  return (
    <div className="pending-alert" onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
      <div className="pending-alert__icon">{icon}</div>
      <div className="pending-alert__body">
        <div className="pending-alert__title">{title}</div>
        <div className="pending-alert__desc">{desc}</div>
      </div>
    </div>
  );
}

interface DataListProps {
  title?: string;
  count?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function DataList({ title, count, children, action }: DataListProps) {
  return (
    <div className="data-list">
      {(title || count) && (
        <div className="data-list__header">
          {title && <span className="data-list__title">{title}</span>}
          {count}
          {action && <span className="section__title-link">{action}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/** Department card. */
interface DeptCardProps {
  icon: string;
  name: string;
  desc: string;
  meta: React.ReactNode;
  color: string;
  onClick?: () => void;
  animationDelay?: number;
}

export function DeptCard({
  icon,
  name,
  desc,
  meta,
  color,
  onClick,
  animationDelay,
}: DeptCardProps) {
  const style: React.CSSProperties = {
    "--dept-color": color,
    ...(animationDelay !== undefined
      ? { animationDelay: `${animationDelay}ms` }
      : {}),
  };
  return (
    <div
      className="dept-card"
      style={style}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="dept-card__icon">{icon}</div>
      <div className="dept-card__body">
        <div className="dept-card__title">{name}</div>
        <div className="dept-card__desc">{desc}</div>
        <div className="dept-card__meta">{meta}</div>
      </div>
      <div className="dept-card__chevron">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </div>
  );
}

/** User list item. */
interface UserItemProps {
  avatar: React.ReactNode;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  meta?: React.ReactNode;
  onClick?: () => void;
  animationDelay?: number;
}

export function UserItem({
  avatar,
  title,
  subtitle,
  meta,
  onClick,
  animationDelay,
}: UserItemProps) {
  const style: React.CSSProperties =
    animationDelay !== undefined
      ? { animationDelay: `${animationDelay}ms` }
      : {};
  return (
    <div
      className="user-item"
      style={style}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className="user-item__avatar">{avatar}</div>
      <div className="user-item__body">
        <div className="user-item__title">{title}</div>
        <div className="user-item__subtitle">{subtitle}</div>
      </div>
      {meta && <div className="user-item__meta">{meta}</div>}
      <div className="user-item__chevron">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 6l6 6-6 6" />
        </svg>
      </div>
    </div>
  );
}

/** Year card. */
interface YearCardProps {
  year: number;
  closed: boolean;
  isCurrent: boolean;
  isRetained: boolean;
  slotLabel: string;
  slotColor: string;
  memberCount: number;
  onToggle: () => void;
  animationDelay?: number;
}

export function YearCard({
  year,
  closed,
  isCurrent,
  isRetained,
  slotLabel,
  slotColor,
  memberCount,
  onToggle,
  animationDelay,
}: YearCardProps) {
  const accentColor = isCurrent
    ? "#F59E0B"
    : isRetained
    ? "#0EA5E9"
    : "#94A3B8";
  const style: React.CSSProperties = {
    "--year-color": accentColor,
    ...(animationDelay !== undefined
      ? { animationDelay: `${animationDelay}ms` }
      : {}),
  };
  return (
    <div className="year-card" style={style}>
      <div className="year-card__number">
        {isCurrent && (
          <span style={{ fontSize: "14px", marginRight: "4px" }}>⭐</span>
        )}
        {year}
      </div>
      <div className="year-card__info">
        <div className="year-card__badges">
          {closed ? (
            <span className="year-slot-pill year-slot-pill--archive">
              ปิดแล้ว
            </span>
          ) : (
            <span className="year-slot-pill year-slot-pill--retained">
              เปิดรับสมาชิก
            </span>
          )}
          <span className="year-card__slot" style={{ color: slotColor }}>
            {slotLabel}
          </span>
        </div>
        <div className="year-card__hint">
          {memberCount} สมาชิกในปีนี้
          {!isRetained && " · ข้อมูลจะหายจากระบบหลัง archive"}
        </div>
      </div>
      <button
        type="button"
        className={`btn ${closed ? "btn--primary" : "btn--ghost"}`}
        onClick={onToggle}
        style={{ flexShrink: 0 }}
      >
        {closed ? "🔓 เปิดรับ" : "ปิดรับ"}
      </button>
    </div>
  );
}

/** Admin hero block (gradient brand background). */
interface AdminHeroProps {
  greeting?: string;
  name: string;
  date?: string;
  stats?: Array<{ value: React.ReactNode; label: string }>;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export function AdminHero({
  greeting,
  name,
  date,
  stats,
  children,
  style,
}: AdminHeroProps) {
  return (
    <div className="admin-hero" style={style}>
      <div className="admin-hero__content">
        {children ? (
          children
        ) : (
          <>
            {greeting && <div className="admin-hero__greeting">{greeting}</div>}
            <div className="admin-hero__name">{name}</div>
            {date && <div className="admin-hero__date">{date}</div>}
            {stats && (
              <div className="admin-hero__stats">
                {stats.map((s, i) => (
                  <div className="admin-hero__stat" key={i}>
                    <div className="admin-hero__stat-value">{s.value}</div>
                    <div className="admin-hero__stat-label">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Info banner (used in edit modals). */
interface InfoBannerProps {
  icon?: React.ReactNode;
  title: string;
  desc: string;
}

export function InfoBanner({ icon, title, desc }: InfoBannerProps) {
  return (
    <div className="info-banner">
      <div className="info-banner__icon">{icon}</div>
      <div className="info-banner__body">
        <div className="info-banner__title">{title}</div>
        <div className="info-banner__desc">{desc}</div>
      </div>
    </div>
  );
}

/** User-dept summary card (used in edit dept modal). */
interface UserDeptSummaryProps {
  avatar: React.ReactNode;
  name: string;
  meta: React.ReactNode;
}

export function UserDeptSummary({
  avatar,
  name,
  meta,
}: UserDeptSummaryProps) {
  return (
    <div className="user-dept-summary">
      <div className="user-dept-summary__avatar">{avatar}</div>
      <div className="user-dept-summary__info">
        <div className="user-dept-summary__name">{name}</div>
        <div className="user-dept-summary__meta">{meta}</div>
      </div>
    </div>
  );
}

/** Current department pill. */
interface CurrentDeptPillProps {
  icon?: string;
  name: string;
  color?: string;
}

export function CurrentDeptPill({ icon, name, color }: CurrentDeptPillProps) {
  const style: React.CSSProperties = color
    ? { "--dept-color": color }
    : {};
  return (
    <div className="current-dept-pill" style={style}>
      <span className="current-dept-pill__icon">{icon || "—"}</span>
      <span className="current-dept-pill__name">{name}</span>
    </div>
  );
}

/** Info card (used in years page). */
interface InfoCardProps {
  title: string;
  body: React.ReactNode;
  slots?: React.ReactNode;
}

export function InfoCard({ title, body, slots }: InfoCardProps) {
  return (
    <div className="info-card">
      <div className="info-card__title">{title}</div>
      <div className="info-card__body">{body}</div>
      {slots && <div className="info-card__slots">{slots}</div>}
    </div>
  );
}

/** Request card. */
interface RequestCardProps {
  avatar: React.ReactNode;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  message?: string;
  time: string;
  onApprove?: () => void;
  onReject?: () => void;
  onOpenDetail?: () => void;
  color?: string;
  animationDelay?: number;
}

export function RequestCard({
  avatar,
  title,
  subtitle,
  message,
  time,
  onApprove,
  onReject,
  onOpenDetail,
  color,
  animationDelay,
}: RequestCardProps) {
  const style: React.CSSProperties = {
    "--accent": color || "var(--yp-sky-500)",
    borderLeftColor: color || "var(--yp-sky-500)",
    ...(animationDelay !== undefined
      ? { animationDelay: `${animationDelay}ms` }
      : {}),
  };
  return (
    <div className="request-card" style={style}>
      <div
        className="request-card__header"
        onClick={onOpenDetail}
        style={{ cursor: onOpenDetail ? "pointer" : "default" }}
      >
        <div className="request-card__avatar">{avatar}</div>
        <div className="request-card__body">
          <div className="request-card__title">{title}</div>
          <div className="request-card__subtitle">{subtitle}</div>
        </div>
        <div className="request-card__time">{time}</div>
      </div>
      {message && <div className="request-card__message">"{message}"</div>}
      {(onApprove || onReject) && (
        <div className="request-card__actions">
          {onReject && (
            <button
              className="btn btn--ghost"
              onClick={(e) => {
                e.stopPropagation();
                onReject();
              }}
              style={{
                color: "#BE123C",
                borderColor: "rgba(244, 63, 94, 0.30)",
              }}
            >
              ปฏิเสธ
            </button>
          )}
          {onApprove && (
            <button
              className="btn btn--primary"
              onClick={(e) => {
                e.stopPropagation();
                onApprove();
              }}
            >
              อนุมัติ
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Color picker (for department color). */
interface ColorPickerProps {
  colors: string[];
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ colors, value, onChange }: ColorPickerProps) {
  return (
    <div className="color-picker">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          className={`color-picker__swatch ${value === c ? "is-selected" : ""}`}
          onClick={() => onChange(c)}
          style={
            { "--swatch-color": c } as React.CSSProperties
          }
          aria-label={`เลือกสี ${c}`}
        />
      ))}
    </div>
  );
}

/** Icon picker (for department icon — emoji). */
interface IconPickerProps {
  icons: string[];
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ icons, value, onChange }: IconPickerProps) {
  return (
    <div className="icon-picker">
      {icons.map((ic) => (
        <button
          key={ic}
          type="button"
          className={`icon-picker__swatch ${value === ic ? "is-selected" : ""}`}
          onClick={() => onChange(ic)}
        >
          {ic}
        </button>
      ))}
    </div>
  );
}

/** Filter bar (select dropdowns). */
interface FilterBarProps {
  children: React.ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
  return <div className="filter-bar">{children}</div>;
}

/** Profile hero (gradient brand). */
interface ProfileHeroProps {
  avatar: React.ReactNode;
  name: string;
  role: string;
  children?: React.ReactNode;
}

export function ProfileHero({ avatar, name, role, children }: ProfileHeroProps) {
  return (
    <div className="profile-hero">
      <div className="profile-hero__glow" />
      <div className="profile-hero__avatar">{avatar}</div>
      <div className="profile-hero__name">{name}</div>
      <div className="profile-hero__role">{role}</div>
      {children}
    </div>
  );
}

/** Sheet actions row (used inside sheet footer). */
interface SheetActionsProps {
  children: React.ReactNode;
}

export function SheetActions({ children }: SheetActionsProps) {
  return <div className="sheet__actions">{children}</div>;
}

/** Form section (used inside sheet body). */
interface FormSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ children, className }: FormSectionProps) {
  return (
    <div className={cn("form-section", className)}>{children}</div>
  );
}

/** Segmented control (3-button toggle). */
interface SegmentedProps {
  options: Array<{ value: string; label: React.ReactNode }>;
  value: string;
  onChange: (value: string) => void;
}

export function Segmented({ options, value, onChange }: SegmentedProps) {
  return (
    <div className="segmented">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`segmented__btn ${value === opt.value ? "is-active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
