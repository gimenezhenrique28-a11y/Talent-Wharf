import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

const INTER_FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/**
 * Scene 1: Open Hook (3 seconds, 90 frames)
 * "You got a cold message." + satisfying notification pop-in
 * Fast, punchy, big text to grab attention
 */
export const HookScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Main text fade-in
  const textP = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 140 },
  });
  const textOpacity = interpolate(textP, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const textTranslateY = interpolate(textP, [0, 1], [30, 0], { extrapolateRight: "clamp" });

  // Notification pop-in (starts at frame 20)
  const notifDelay = 20;
  const notifP = spring({
    frame,
    fps,
    delay: notifDelay,
    config: { damping: 15, stiffness: 150 },
  });
  const notifScale = interpolate(notifP, [0, 1], [0.3, 1], { extrapolateRight: "clamp" });
  const notifOpacity = interpolate(notifP, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: "#ffffff",
        fontFamily: INTER_FONT,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
      }}
    >
      {/* Main text */}
      <div
        style={{
          opacity: textOpacity,
          transform: `translateY(${textTranslateY}px)`,
          fontSize: 52,
          fontWeight: 800,
          color: "#000000",
          textAlign: "center",
          lineHeight: 1.2,
          maxWidth: "90%",
          marginBottom: 40,
        }}
      >
        You got a cold message.
      </div>

      {/* Notification pop-in */}
      <div
        style={{
          opacity: notifOpacity,
          transform: `scale(${notifScale})`,
          transformOrigin: "top right",
          position: "fixed",
          top: 20,
          right: 20,
          width: 280,
          background: "#f0f0f0",
          border: "1px solid #cccccc",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          display: "flex",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        {/* Icon */}
        <div
          style={{
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          💬
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#000000",
              marginBottom: 2,
            }}
          >
            New Message
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#666666",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            interested in your company
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
