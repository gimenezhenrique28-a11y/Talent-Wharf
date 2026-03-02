import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { WharfWordmark } from "../screens/shared";

const INTER_FONT = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const COLORS = {
  black: "#0a0a0a",
  white: "#ffffff",
  gray400: "#a0a0a0",
  gray500: "#808080",
  gray600: "#666666",
  gray900: "#1a1a1a",
  border: "#2d2d2d",
  borderStrong: "#404040",
  success: "#6ee7b7",
};

/**
 * Scene 3: Dashboard Save (3 seconds, 90 frames)
 * Extension popup appears over LinkedIn message, showing profile extracted and saved
 */
export const DashboardSaveScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background fade in
  const bgOpacity = interpolate(frame, [0, 8], [0, 0.5], { extrapolateRight: "clamp" });

  // Extension popup slides in
  const popupDelay = 15;
  const popupP = spring({
    frame,
    fps,
    delay: popupDelay,
    config: { damping: 15, stiffness: 120 },
  });
  const popupScale = interpolate(popupP, [0, 1], [0.85, 1], { extrapolateRight: "clamp" });
  const popupOpacity = interpolate(popupP, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  // Profile data appears
  const showProfile = frame >= popupDelay + 20;
  const profP = showProfile ? spring({ frame, fps, delay: popupDelay + 20, config: { damping: 200 } }) : 0;
  const profOpacity = interpolate(profP as number, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  // Success checkmark
  const showSuccess = frame >= 70;
  const successP = showSuccess ? spring({ frame, fps, delay: 70, config: { damping: 12, stiffness: 100 } }) : 0;
  const successOpacity = interpolate(successP as number, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const SKILLS = ["React", "Node.js", "TypeScript", "AWS"];

  return (
    <AbsoluteFill
      style={{
        background: "#ffffff",
        fontFamily: INTER_FONT,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Blurred/dimmed LinkedIn background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: bgOpacity,
          background: COLORS.black,
          zIndex: 0,
        }}
      />

      {/* Extension popup overlay */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 1,
        }}
      >
        {/* Extension popup */}
        <div
          style={{
            width: 320,
            maxHeight: 480,
            opacity: popupOpacity,
            transform: `scale(${popupScale})`,
            transformOrigin: "top right",
            background: COLORS.black,
            borderRadius: 12,
            border: `1px solid ${COLORS.border}`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.9)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Extension Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px 10px",
              borderBottom: `1px solid ${COLORS.border}`,
            }}
          >
            <div style={{ color: COLORS.white, lineHeight: 0 }}>
              <WharfWordmark height={18} />
            </div>
            <span style={{ fontSize: 12, color: COLORS.gray500 }}>⚙️</span>
          </div>

          {/* Content */}
          <div style={{ padding: "12px 14px 14px" }}>
            {!showProfile && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "24px 0",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    border: `2px solid ${COLORS.borderStrong}`,
                    borderTopColor: COLORS.white,
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <span style={{ fontSize: 11, color: COLORS.gray500, textAlign: "center" }}>
                  Extracting profile...
                </span>
              </div>
            )}

            {showProfile && !showSuccess && (
              <div
                style={{
                  opacity: profOpacity,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {/* Source badge */}
                <span
                  style={{
                    alignSelf: "flex-start",
                    background: "rgba(255,255,255,0.06)",
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.gray400,
                    fontSize: 10,
                    fontWeight: 500,
                    padding: "2px 8px",
                    borderRadius: 100,
                  }}
                >
                  LinkedIn
                </span>

                {/* Candidate card */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: COLORS.gray900,
                    border: `1px solid ${COLORS.borderStrong}`,
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "#0a66c2",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "white",
                      flexShrink: 0,
                    }}
                  >
                    SK
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.white }}>Sarah Kim</div>
                    <div style={{ fontSize: 10, color: COLORS.gray400, marginTop: 2 }}>
                      Senior Engineer
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: COLORS.gray400 }}>
                  <span>✉️</span>
                  <span>sarah.kim@email.com</span>
                </div>

                {/* Skills */}
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: COLORS.gray500,
                      marginBottom: 6,
                    }}
                  >
                    Skills detected
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {SKILLS.map((skill) => (
                      <span
                        key={skill}
                        style={{
                          background: "rgba(110, 231, 183, 0.1)",
                          color: COLORS.success,
                          fontSize: 9,
                          fontWeight: 500,
                          padding: "3px 8px",
                          borderRadius: 4,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Save button */}
                <button
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: COLORS.success,
                    color: COLORS.black,
                    border: "none",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    marginTop: 4,
                  }}
                >
                  ➕ Add to Wharf
                </button>
              </div>
            )}

            {showSuccess && (
              <div
                style={{
                  opacity: successOpacity,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px 0",
                  gap: 8,
                  textAlign: "center",
                }}
              >
                <span style={{ fontSize: 24 }}>✅</span>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: COLORS.success,
                  }}
                >
                  Candidate added!
                </div>
                <div style={{ fontSize: 10, color: COLORS.gray400 }}>Sarah Kim saved to Wharf</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spinner animation keyframes */}
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </AbsoluteFill>
  );
};
