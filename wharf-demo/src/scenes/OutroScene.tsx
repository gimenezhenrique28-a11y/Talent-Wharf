import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
const INTER_FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
import { WharfWordmark } from "../screens/shared";

/**
 * Scene 6: Big Logo Outro (4 seconds, 120 frames)
 * HUGE WharfWordmark logo with tagline
 * Simple, clean, confident brand moment
 */
export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Using Inter font directly

  // Logo spring animation (snappy)
  const logoP = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 140 },
  });
  const logoScale = interpolate(logoP, [0, 1], [0.5, 1], { extrapolateRight: "clamp" });
  const logoOpacity = interpolate(logoP, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  // Tagline fade-in (after logo)
  const taglineDelay = 20;
  const taglineP = spring({
    frame,
    fps,
    delay: taglineDelay,
    config: { damping: 20, stiffness: 140 },
  });
  const taglineOpacity = interpolate(taglineP, [0, 1], [0, 1], { extrapolateRight: "clamp" });

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
        gap: 32,
      }}
    >
      {/* HUGE Logo */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale})`,
          color: "#000000",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <WharfWordmark height={280} />
      </div>

      {/* Tagline */}
      <div
        style={{
          opacity: taglineOpacity,
          fontSize: 18,
          fontWeight: 400,
          color: "#666666",
          textAlign: "center",
        }}
      >
        Save great people early.
      </div>
    </AbsoluteFill>
  );
};
