/**
 * SVG icon set ported from ypadmin-demo-v1.5 core/ui.js
 * All icons use stroke-based style (fill:none, stroke-width:1.8 by default).
 */
import React from "react";

const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function makeIcon(path: React.ReactNode) {
  return function Icon({ size = 24, ...rest }: IconProps) {
    return (
      <svg
        {...baseProps}
        width={size}
        height={size}
        {...rest}
      >
        {path}
      </svg>
    );
  };
}

export const HomeIcon = makeIcon(
  <>
    <path d="M3 12L12 4l9 8M5 10v10h14V10" />
  </>
);

export const CalendarIcon = makeIcon(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v4M16 3v4" />
  </>
);

export const ListIcon = makeIcon(
  <>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </>
);

export const UserIcon = makeIcon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
  </>
);

export const PlusIcon = makeIcon(<path d="M12 5v14M5 12h14" />);

export const ChevronRightIcon = makeIcon(<path d="M9 6l6 6-6 6" />);
export const ChevronLeftIcon = makeIcon(<path d="M15 6l-6 6 6 6" />);
export const ChevronUpIcon = makeIcon(<path d="M6 15l6-6 6 6" />);
export const ChevronDownIcon = makeIcon(<path d="M6 9l6 6 6-6" />);

export const CloseIcon = makeIcon(<path d="M18 6L6 18M6 6l12 12" />);
export const CheckIcon = makeIcon(<path d="M5 12l5 5L20 7" />);

export const ClockIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </>
);

export const BellIcon = makeIcon(
  <>
    <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 3h16zM10 19a2 2 0 0 0 4 0" />
  </>
);

export const LogoutIcon = makeIcon(
  <>
    <path d="M16 17l5-5-5-5M21 12H9M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" />
  </>
);

export const TrashIcon = makeIcon(
  <>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
  </>
);

export const EditIcon = makeIcon(
  <>
    <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
  </>
);

export const UsersIcon = makeIcon(
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2 21c0-3.5 3-6 7-6s7 2.5 7 6" />
    <path d="M16 3.5a3.5 3.5 0 0 1 0 7M22 21c0-3-2-5-5-6" />
  </>
);

export const SearchIcon = makeIcon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </>
);

export const AlertIcon = makeIcon(
  <>
    <path d="M12 2L1 21h22zM12 9v4M12 17v.01" />
  </>
);

export const RefreshIcon = makeIcon(
  <>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
  </>
);

export const InfoIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v.01M12 11v5" />
  </>
);

export const ArrowLeftIcon = makeIcon(<path d="M19 12H5M12 19l-7-7 7-7" />);

export const IdCardIcon = makeIcon(
  <>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <circle cx="8" cy="11" r="2" />
    <path d="M5 16c.5-1.5 2-2 3-2s2.5.5 3 2M14 9h5M14 13h5M14 16h3" />
  </>
);

export const BuildingIcon = makeIcon(
  <>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <path d="M9 7h0M15 7h0M9 11h0M15 11h0M9 15h0M15 15h0M10 21v-3h4v3" />
  </>
);

export const ShieldIcon = makeIcon(
  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
);

export const KeyIcon = makeIcon(
  <>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3" />
  </>
);

export const InboxIcon = makeIcon(
  <>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </>
);

export const BanIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M4.93 4.93l14.14 14.14" />
  </>
);

export const PowerIcon = makeIcon(
  <path d="M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10" />
);

export const StarIcon = makeIcon(
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
);

export const PaletteIcon = makeIcon(
  <>
    <circle cx="13.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="10.5" r="2.5" />
    <circle cx="8.5" cy="7.5" r="2.5" />
    <circle cx="6.5" cy="12.5" r="2.5" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-4.96-4.49-9-10-9z" />
  </>
);

export const CheckCircleIcon = makeIcon(
  <>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </>
);

export const XCircleIcon = makeIcon(
  <>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </>
);

export const MenuIcon = makeIcon(
  <>
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </>
);

export const LayoutIcon = makeIcon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="9" y1="21" x2="9" y2="9" />
  </>
);

export const MailIcon = makeIcon(
  <>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </>
);

export const SendIcon = makeIcon(
  <>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </>
);

export const UserPlusIcon = makeIcon(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </>
);

export const FilterIcon = makeIcon(
  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
);
