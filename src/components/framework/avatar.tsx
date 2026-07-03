/**
 * SVG-based avatar renderer (port from ypadmin-demo-v1.5 framework/avatar.js)
 *
 * Why SVG? On iOS, long-press on text nodes inside <div>/<a> can sometimes
 * still select/copy text — even in PWA standalone. Switching to inline SVG
 * with <text> means the browser treats it as graphic, not selectable text.
 */
import React from "react";
import { initials } from "@/lib/utils/format";

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}

export function Avatar({
  name,
  color,
  size = 32,
  className = "",
}: AvatarProps) {
  const text = initials(name) || "?";
  const useBrand = !color;
  const gradId = React.useId();
  const fontSize = Math.round(size * 0.42);
  const radius = size;

  const fill = useBrand ? `url(#${gradId})` : color;

  const gradDef = useBrand ? (
    <defs>
      <linearGradient
        id={gradId}
        x1="0%"
        y1="0%"
        x2="100%"
        y2="100%"
      >
        <stop offset="0%" stopColor="#0EA5E9" />
        <stop offset="100%" stopColor="#06B6D4" />
      </linearGradient>
    </defs>
  ) : null;

  return (
    <svg
      className={`avatar-svg${className ? " " + className : ""}`}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-hidden="true"
    >
      {gradDef}
      <rect
        width={size}
        height={size}
        rx={radius}
        ry={radius}
        fill={fill}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Noto Sans Thai', 'Inter', system-ui, sans-serif"
        fontSize={fontSize}
        fontWeight="700"
        fill="#FFFFFF"
        letterSpacing="0.5"
      >
        {escapeXml(text)}
      </text>
    </svg>
  );
}

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
