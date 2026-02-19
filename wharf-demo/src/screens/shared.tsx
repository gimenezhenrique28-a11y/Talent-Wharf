import React from "react";

// Exact CSS vars from the app's index.css
export const COLORS = {
  black: "#0A0A0A",
  white: "#FFFFFF",
  gray900: "#171717",
  gray800: "#262626",
  gray700: "#404040",
  gray600: "#525252",
  gray500: "#737373",
  gray400: "#A3A3A3",
  gray300: "#D4D4D4",
  gray200: "#E5E5E5",
  border: "rgba(255,255,255,0.07)",
  borderStrong: "rgba(255,255,255,0.12)",
  success: "#6ee7b7",
  warning: "#fde68a",
  danger: "#fca5a5",
  successSubtle: "rgba(110,231,183,0.10)",
  warningSubtle: "rgba(253,230,138,0.10)",
  dangerSubtle: "rgba(252,165,165,0.10)",
};

export const FONT =
  "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', 'Arial', sans-serif";

// Exact SVG wordmark from Dashboard.jsx
export const WharfWordmark: React.FC<{ height?: number }> = ({
  height = 28,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      version="1.1"
      viewBox="0 0 160 160"
      height={height}
      style={{ width: "auto", display: "block" }}
    >
      <path
        fill="currentColor"
        d="M61.37,65.52h6.16v9.81c1.58-1.65,4.12-2.89,7.39-2.89,5.27,0,8.85,3.54,8.85,9.16v11.54h-6.16v-9.74c0-3.42-1.65-5.5-4.81-5.5-3.35,0-5.27,2.04-5.27,5.54v9.7h-6.16v-27.63Z"
      />
      <path
        fill="currentColor"
        d="M86.26,87.3c0-3.96,3.5-5.93,8.27-6.39l8.08-.73v-.12c0-1.54-1.31-2.77-4.58-2.77-2.77,0-4.89,1.15-5.5,2.73l-5.54-1.5c1.27-3.66,5.73-6.08,11.31-6.08,6.46,0,10.27,2.58,10.27,7.66v7.39c0,1.08.46,1.58,2.62,1.12v4.54c-4.5.85-6.97-.31-8-2.23-1.85,1.62-4.77,2.66-8.35,2.66-5,0-8.58-2.27-8.58-6.27ZM102.61,84.3l-7.2.73c-2.12.19-3.19.69-3.19,2.04s1.35,2,3.73,2c3.16,0,6.66-1.35,6.66-3.69v-1.08Z"
      />
      <path
        fill="currentColor"
        d="M130.28,77.95c-3.8-.09-2.39-.08-3.7-.1-5.21-.09-7.11,2.52-7.11,7.06v8.24h-6.16v-20.28h6.16v3.5c1.77-2.58,2.92-3.51,6.23-3.51.92,0,.15-.01,4.58.01v5.08Z"
      />
      <path
        fill="currentColor"
        d="M144.4,65.1c1.89,0,3.85.27,5.08.73l-.81,4.81c-1.27-.35-2.46-.54-3.89-.54-2.62,0-3.85.77-3.85,2.58v.19h7.47v5.08h-7.47v15.2h-6.08v-15.2h-4.58v-5.08h4.58v-.31c0-5.04,3.54-7.47,9.54-7.47Z"
      />
      <polygon
        fill="currentColor"
        points="22.99 93.15 18.01 65.5 9.61 65.5 14.69 93.15 22.99 93.15"
      />
      <polygon
        fill="currentColor"
        points="35.34 65.5 39.97 93.15 47.25 93.15 42.61 65.5 35.34 65.5"
      />
      <polygon
        fill="currentColor"
        points="30.36 93.15 35.02 65.5 27.94 65.5 23.3 93.15 30.36 93.15"
      />
      <polygon
        fill="currentColor"
        points="52.54 65.5 47.56 93.15 55.67 93.15 60.75 65.5 52.54 65.5"
      />
    </svg>
  );
};

// App header - exact replica from Dashboard.jsx
export const AppHeader: React.FC<{ activeNav?: string }> = ({
  activeNav = "Home",
}) => {
  const navItems = ["Home", "Candidates", "Add", "Import"];

  return (
    <div
      style={{
        height: 44,
        background: "rgba(10,10,10,0.90)",
        borderBottom: `1px solid ${COLORS.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
        gap: 8,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div
        style={{
          color: COLORS.white,
          lineHeight: 0,
          flexShrink: 0,
        }}
      >
        <WharfWordmark height={38} />
      </div>

      {/* Nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flex: 1,
          justifyContent: "center",
        }}
      >
        {navItems.map((item) => (
          <span
            key={item}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "-0.011em",
              color: item === activeNav ? COLORS.white : COLORS.gray400,
              background:
                item === activeNav ? "rgba(255,255,255,0.08)" : "transparent",
            }}
          >
            {item}
          </span>
        ))}
      </div>

      {/* User avatar */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: COLORS.gray800,
          border: `1px solid ${COLORS.borderStrong}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 8,
          fontWeight: 500,
          color: COLORS.gray300,
          flexShrink: 0,
        }}
      >
        HC
      </div>
    </div>
  );
};

// Status badge matching the app exactly
export const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, { bg: string; color: string }> = {
    new: { bg: "rgba(255,255,255,0.08)", color: COLORS.white },
    contacted: { bg: "rgba(255,255,255,0.05)", color: COLORS.gray400 },
    interviewing: { bg: COLORS.warningSubtle, color: COLORS.warning },
    hired: { bg: COLORS.successSubtle, color: COLORS.success },
    rejected: { bg: COLORS.dangerSubtle, color: COLORS.danger },
  };
  const s = styles[status] || styles.new;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 100,
        fontSize: 9,
        fontWeight: 500,
        letterSpacing: "-0.006em",
        background: s.bg,
        color: s.color,
      }}
    >
      {status}
    </span>
  );
};

export const SourceBadge: React.FC<{ source: string }> = ({ source }) => (
  <span
    style={{
      display: "inline-flex",
      padding: "2px 7px",
      borderRadius: 100,
      fontSize: 8,
      fontWeight: 500,
      background: "rgba(255,255,255,0.04)",
      color: COLORS.gray500,
    }}
  >
    {source}
  </span>
);
