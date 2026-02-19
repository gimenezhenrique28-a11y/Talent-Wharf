import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, FONT, WharfWordmark } from "../screens/shared";

export const ExtensionGmailVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp" });

  const popupDelay = 15;
  const popupP = spring({ frame, fps, delay: popupDelay, config: { damping: 15, stiffness: 120 } });
  const popupScale = interpolate(popupP, [0, 1], [0.85, 1]);
  const popupOpacity = interpolate(popupP, [0, 1], [0, 1]);

  const isLoading = frame >= popupDelay + 5 && frame < popupDelay + 22;
  const showCandidate = frame >= popupDelay + 22;
  const candP = showCandidate ? spring({ frame, fps, delay: popupDelay + 22, config: { damping: 200 } }) : 0;

  const buttonPress = frame >= 80;
  const showSuccess = frame >= 88;
  const successP = showSuccess ? spring({ frame, fps, delay: 88, config: { damping: 12, stiffness: 100 } }) : 0;

  return (
    <AbsoluteFill style={{ background: "#1a1a1a", fontFamily: FONT }}>
      {/* Fake Gmail background */}
      <div style={{ opacity: bgOpacity, height: "100%", position: "relative" }}>
        {/* Gmail top bar */}
        <div style={{
          height: 40, background: "#1a1a1a", borderBottom: "1px solid #333",
          display: "flex", alignItems: "center", padding: "0 10px", gap: 8,
        }}>
          <span style={{ fontSize: 12 }}>☰</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 4,
              background: "linear-gradient(135deg, #4285f4, #ea4335, #fbbc05, #34a853)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#fff" }}>M</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#e8eaed" }}>Gmail</span>
          </div>
          <div style={{
            flex: 1, height: 28, borderRadius: 8, background: "#303134",
            display: "flex", alignItems: "center", padding: "0 10px",
            fontSize: 9, color: "#9aa0a6", marginLeft: 8,
          }}>🔍 Search mail</div>
        </div>

        {/* Email thread */}
        <div style={{ padding: "12px" }}>
          {/* Thread header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, marginBottom: 12,
          }}>
            <span style={{ fontSize: 12, color: "#9aa0a6" }}>←</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#e8eaed" }}>
                Re: Application for Product Designer Role
              </div>
            </div>
          </div>

          {/* Email message */}
          <div style={{
            background: "#202124", borderRadius: 8, padding: 12,
            border: "1px solid #333",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "linear-gradient(135deg, #5c6bc0, #7e57c2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 500, color: "#fff", flexShrink: 0,
              }}>EP</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: "#e8eaed" }}>Emily Park</span>
                  <span style={{ fontSize: 8, color: "#9aa0a6" }}>{"<emily.park@design.io>"}</span>
                </div>
                <div style={{ fontSize: 8, color: "#9aa0a6", marginTop: 1 }}>to me · 2 hours ago</div>
              </div>
            </div>

            <div style={{ fontSize: 10, color: "#bdc1c6", lineHeight: 1.7 }}>
              Hi Henrique,{"\n\n"}
              Thank you for reaching out! I'm very interested in the Product Designer role at your company.{"\n\n"}
              I have 5+ years of experience in UI/UX design, with expertise in Figma, design systems, and user research. I'd love to schedule a call to discuss the opportunity further.{"\n\n"}
              Best,{"\n"}Emily Park
            </div>
          </div>

          {/* Quick reply box */}
          <div style={{
            marginTop: 10, background: "#303134", borderRadius: 8, padding: "8px 10px",
            border: "1px solid #5f6368",
            fontSize: 9, color: "#9aa0a6",
          }}>Click here to reply...</div>
        </div>
      </div>

      {/* Extension Popup overlay */}
      <div style={{
        position: "absolute", top: 40, right: 12,
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
              <span style={{ fontSize: 10, color: COLORS.gray500 }}>Extracting Gmail sender...</span>
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
              }}>Gmail</span>

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
                }}>EP</div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.white }}>Emily Park</div>
                  <div style={{ fontSize: 9, color: COLORS.gray400, marginTop: 1 }}>Re: Application for Product Designer Role</div>
                </div>
              </div>

              {/* Email */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: COLORS.gray400 }}>
                <span>✉</span><span>emily.park@design.io</span>
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
              <div style={{ fontSize: 10, color: COLORS.gray400 }}>Emily Park</div>
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
