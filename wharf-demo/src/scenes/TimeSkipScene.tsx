import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
const INTER_FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/**
 * Scene 4: Time Skip (2 seconds, 60 frames)
 * Fast visual transition showing time passing
 * "3 months later"
 */
export const TimeSkipScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Using Inter font directly

  // Text fade in and out
  const textP = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 140 },
  });
  const textOpacity = interpolate(frame, [0, 15, 45, 60], [0, 1, 1, 0], { extrapolateRight: "clamp" });

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
      {/* Calendar/time visual */}
      <div
        style={{
          fontSize: 64,
          marginBottom: 24,
          opacity: textOpacity,
        }}
      >
        📅
      </div>

      {/* Text */}
      <div
        style={{
          fontSize: 32,
          fontWeight: 600,
          color: "#000000",
          textAlign: "center",
          opacity: textOpacity,
        }}
      >
        3 months later
      </div>
    </AbsoluteFill>
  );
};
