import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { COLORS, FONT, WharfWordmark } from "../screens/shared";

export const EmailComposerVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Modal slides up
  const modalProgress = spring({ frame, fps, config: { damping: 15, stiffness: 120 } });
  const modalY = interpolate(modalProgress, [0, 1], [200, 0]);
  const modalOpacity = interpolate(modalProgress, [0, 1], [0, 1]);

  // Template selection animation
  const showTemplate = frame >= 25;
  const templateProgress = showTemplate
    ? spring({ frame, fps, delay: 25, config: { damping: 200 } })
    : 0;

  // Variable fields appear
  const showVars = frame >= 40;
  const varProgress = showVars ? spring({ frame, fps, delay: 40, config: { damping: 200 } }) : 0;

  // Typing in subject
  const SUBJECT = "Interview Invitation - Senior Engineer at Wharf";
  const subjectChars = Math.min(
    Math.floor(interpolate(frame, [50, 75], [0, SUBJECT.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })),
    SUBJECT.length
  );

  // Body content appears
  const BODY = "Hi {name},\n\nWe were impressed by your background and would love to invite you to interview for the Senior Engineer position at Wharf.\n\nThe interview is scheduled for {date} at {time}.\n\nBest regards,\nHenrique";
  const bodyChars = Math.min(
    Math.floor(interpolate(frame, [55, 95], [0, BODY.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })),
    BODY.length
  );

  // Send button pulse at end
  const sendReady = frame >= 100;

  return (
    <AbsoluteFill style={{ background: "rgba(10,10,10,0.85)", fontFamily: FONT }}>
      {/* Background overlay */}
      <AbsoluteFill style={{ background: COLORS.black, opacity: 0.6 }} />

      {/* Modal */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, top: 40,
        opacity: modalOpacity,
        transform: `translateY(${modalY}px)`,
        background: COLORS.gray900,
        borderTopLeftRadius: 16, borderTopRightRadius: 16,
        border: `1px solid ${COLORS.borderStrong}`,
        borderBottom: "none",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Modal header */}
        <div style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${COLORS.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: COLORS.white, letterSpacing: "-0.02em" }}>
            Send Email
          </div>
          <div style={{
            fontSize: 10, color: COLORS.gray400,
            background: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 4,
          }}>2 recipients</div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
          {/* Template selector */}
          <div>
            <div style={{ fontSize: 8, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: COLORS.gray500, marginBottom: 4 }}>
              Template
            </div>
            <div style={{
              height: 30, borderRadius: 6,
              border: `1px solid ${COLORS.borderStrong}`, background: COLORS.black,
              padding: "0 10px", display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span style={{ fontSize: 10, color: showTemplate ? COLORS.white : COLORS.gray500 }}>
                {showTemplate ? "Interview Invitation" : "Select a template..."}
              </span>
              <span style={{ fontSize: 8, color: COLORS.gray500 }}>▼</span>
            </div>
          </div>

          {/* Variable fields */}
          {showVars && (
            <div style={{
              opacity: interpolate(varProgress as number, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(varProgress as number, [0, 1], [8, 0])}px)`,
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
            }}>
              {[
                { label: "Company", value: "Wharf" },
                { label: "Position", value: "Senior Engineer" },
                { label: "Date", value: "Feb 24, 2026" },
                { label: "Time", value: "2:00 PM EST" },
              ].map((v) => (
                <div key={v.label}>
                  <div style={{ fontSize: 7, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: COLORS.gray500, marginBottom: 3 }}>
                    {v.label}
                  </div>
                  <div style={{
                    height: 26, borderRadius: 6,
                    border: `1px solid ${COLORS.borderStrong}`, background: COLORS.black,
                    padding: "0 8px", display: "flex", alignItems: "center",
                    fontSize: 9, color: COLORS.white,
                  }}>{v.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Subject */}
          <div>
            <div style={{ fontSize: 8, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: COLORS.gray500, marginBottom: 4 }}>
              Subject
            </div>
            <div style={{
              height: 30, borderRadius: 6,
              border: `1px solid ${COLORS.borderStrong}`, background: COLORS.black,
              padding: "0 10px", display: "flex", alignItems: "center",
              fontSize: 10, color: subjectChars > 0 ? COLORS.white : COLORS.gray500,
            }}>
              {subjectChars > 0 ? SUBJECT.slice(0, subjectChars) : "Subject line..."}
              {subjectChars > 0 && subjectChars < SUBJECT.length && (
                <span style={{ display: "inline-block", width: 1, height: 10, background: COLORS.white, marginLeft: 1 }} />
              )}
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 8, fontWeight: 500, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: COLORS.gray500, marginBottom: 4 }}>
              Message
            </div>
            <div style={{
              flex: 1, borderRadius: 6,
              border: `1px solid ${COLORS.borderStrong}`, background: COLORS.black,
              padding: "8px 10px", minHeight: 140,
            }}>
              <span style={{
                fontSize: 9, color: bodyChars > 0 ? COLORS.gray300 : COLORS.gray500,
                lineHeight: 1.7, whiteSpace: "pre-wrap",
              }}>
                {bodyChars > 0 ? BODY.slice(0, bodyChars) : "Write your message..."}
              </span>
            </div>
          </div>

          <div style={{ fontSize: 8, color: COLORS.gray500 }}>
            Use {"{"} name {"}"} to insert the candidate's name automatically.
          </div>

          {/* Send button */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "9px 14px", borderRadius: 6,
            background: sendReady ? COLORS.white : COLORS.gray800,
            color: sendReady ? COLORS.black : COLORS.gray500,
            fontSize: 11, fontWeight: 500,
          }}>✉ Send Email</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
