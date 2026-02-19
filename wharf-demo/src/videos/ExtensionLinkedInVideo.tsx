import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, FONT, WharfWordmark } from "../screens/shared";

const SKILLS = ["React", "Node.js", "TypeScript", "AWS", "PostgreSQL", "Docker", "GraphQL", "Next.js"];

export const ExtensionLinkedInVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background LinkedIn page mockup fades in
  const bgOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  // Extension popup slides down from top-right
  const popupDelay = 15;
  const popupP = spring({ frame, fps, delay: popupDelay, config: { damping: 15, stiffness: 120 } });
  const popupScale = interpolate(popupP, [0, 1], [0.85, 1]);
  const popupOpacity = interpolate(popupP, [0, 1], [0, 1]);

  // Loading state
  const isLoading = frame >= popupDelay + 5 && frame < popupDelay + 25;

  // Candidate data appears
  const showCandidate = frame >= popupDelay + 25;
  const candP = showCandidate ? spring({ frame, fps, delay: popupDelay + 25, config: { damping: 200 } }) : 0;

  // Add to Wharf button press
  const buttonPress = frame >= 85;

  // Success state
  const showSuccess = frame >= 92;
  const successP = showSuccess ? spring({ frame, fps, delay: 92, config: { damping: 12, stiffness: 100 } }) : 0;

  return (
    <AbsoluteFill style={{ background: "#1b1f23", fontFamily: FONT }}>
      {/* Fake LinkedIn background */}
      <div style={{ opacity: bgOpacity, padding: "0px", height: "100%", position: "relative" }}>
        {/* LinkedIn-style top bar */}
        <div style={{
          height: 36, background: "#1b1f23", borderBottom: "1px solid #333",
          display: "flex", alignItems: "center", padding: "0 12px", gap: 10,
        }}>
          <div style={{ width: 20, height: 20, borderRadius: 4, background: "#0a66c2", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>in</span>
          </div>
          <div style={{
            flex: 1, height: 24, borderRadius: 4, background: "#38434f",
            display: "flex", alignItems: "center", padding: "0 8px",
            fontSize: 9, color: "#9ca3af",
          }}>🔍 Search</div>
          <div style={{ display: "flex", gap: 12 }}>
            {["🏠", "👥", "💼", "✉", "🔔"].map((icon, i) => (
              <span key={i} style={{ fontSize: 11, opacity: 0.5 }}>{icon}</span>
            ))}
          </div>
        </div>

        {/* Fake profile content */}
        <div style={{ padding: "12px" }}>
          {/* Banner */}
          <div style={{
            height: 80, borderRadius: 8, background: "linear-gradient(135deg, #1e3a5f, #0a66c2)",
            marginBottom: -24, position: "relative",
          }} />
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: "50%", background: "#38434f",
            border: "3px solid #1b1f23", marginLeft: 12, position: "relative",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 500, color: "#9ca3af",
          }}>SC</div>
          <div style={{ padding: "8px 12px" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>Sarah Chen</div>
            <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 2 }}>Senior Full Stack Engineer at Stripe</div>
            <div style={{ fontSize: 9, color: "#6b7280", marginTop: 2 }}>San Francisco, CA · 500+ connections</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <div style={{ padding: "4px 14px", borderRadius: 100, background: "#0a66c2", color: "#fff", fontSize: 10, fontWeight: 500 }}>Connect</div>
              <div style={{ padding: "4px 14px", borderRadius: 100, border: "1px solid #0a66c2", color: "#0a66c2", fontSize: 10, fontWeight: 500 }}>Message</div>
            </div>
          </div>

          {/* About section */}
          <div style={{
            marginTop: 10, background: "#1e2328", borderRadius: 8, padding: 12,
            border: "1px solid #333",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 6 }}>About</div>
            <div style={{ fontSize: 9, color: "#9ca3af", lineHeight: 1.6 }}>
              Full-stack engineer with 6+ years of experience. Passionate about clean code, scalable systems, and developer tooling.
            </div>
          </div>
        </div>
      </div>

      {/* Extension Popup overlay */}
      <div style={{
        position: "absolute", top: 36, right: 12,
        width: 280,
        opacity: popupOpacity,
        transform: `scale(${popupScale})`,
        transformOrigin: "top right",
        background: COLORS.black,
        borderRadius: 10,
        border: `1px solid ${COLORS.borderStrong}`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
        overflow: "hidden",
      }}>
        {/* Extension header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 12px 8px", borderBottom: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ color: COLORS.white, lineHeight: 0 }}>
            <WharfWordmark height={16} />
          </div>
          <span style={{ fontSize: 10, color: COLORS.gray500 }}>⚙</span>
        </div>

        {/* Content area */}
        <div style={{ padding: "10px 12px 12px" }}>
          {isLoading && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "20px 0", gap: 8,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: "50%",
                border: `2px solid ${COLORS.borderStrong}`,
                borderTopColor: COLORS.white,
              }} />
              <span style={{ fontSize: 10, color: COLORS.gray500 }}>Extracting LinkedIn profile...</span>
            </div>
          )}

          {showCandidate && !showSuccess && (
            <div style={{
              opacity: interpolate(candP as number, [0, 1], [0, 1]),
              display: "flex", flexDirection: "column", gap: 8,
            }}>
              {/* Source badge */}
              <span style={{
                alignSelf: "flex-start",
                background: "rgba(255,255,255,0.06)", border: `1px solid ${COLORS.border}`,
                color: COLORS.gray400, fontSize: 9, fontWeight: 500,
                padding: "2px 8px", borderRadius: 100,
              }}>LinkedIn</span>

              {/* Candidate card */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: COLORS.gray900, border: `1px solid ${COLORS.borderStrong}`,
                borderRadius: 6, padding: 8,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: COLORS.gray800, border: `1px solid ${COLORS.borderStrong}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 500, color: COLORS.gray300, flexShrink: 0,
                }}>SC</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.white }}>Sarah Chen</div>
                  <div style={{ fontSize: 9, color: COLORS.gray400, marginTop: 1 }}>Senior Full Stack Engineer at Stripe</div>
                </div>
              </div>

              {/* Email */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: COLORS.gray400 }}>
                <span>✉</span><span>sarah.chen@email.com</span>
              </div>

              {/* Skills */}
              <div>
                <div style={{ fontSize: 8, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: COLORS.gray500, marginBottom: 4 }}>
                  Skills detected
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {SKILLS.map((skill, i) => {
                    const skillDelay = (popupDelay + 25) + 2 + i * 1.5;
                    const sP = spring({ frame, fps, delay: skillDelay, config: { damping: 200 } });
                    return (
                      <span key={skill} style={{
                        opacity: interpolate(sP, [0, 1], [0, 1]),
                        background: COLORS.gray900, border: `1px solid ${COLORS.border}`,
                        color: COLORS.gray400, fontSize: 8,
                        padding: "1px 6px", borderRadius: 100,
                      }}>{skill}</span>
                    );
                  })}
                </div>
              </div>

              {/* Add to Wharf button */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                padding: "7px", borderRadius: 6,
                background: buttonPress ? COLORS.gray200 : COLORS.white,
                color: COLORS.black, fontSize: 11, fontWeight: 500,
                transform: buttonPress && !showSuccess ? "scale(0.98)" : "scale(1)",
              }}>+ Add to Wharf</div>
            </div>
          )}

          {showSuccess && (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", padding: "20px 0", gap: 8,
              opacity: interpolate(successP as number, [0, 1], [0, 1]),
              transform: `scale(${interpolate(successP as number, [0, 1], [0.8, 1])})`,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: COLORS.successSubtle,
                border: `1px solid rgba(110,231,183,0.3)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, color: COLORS.success,
              }}>✓</div>
              <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.white }}>Candidate added</div>
              <div style={{ fontSize: 10, color: COLORS.gray400 }}>Sarah Chen</div>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
