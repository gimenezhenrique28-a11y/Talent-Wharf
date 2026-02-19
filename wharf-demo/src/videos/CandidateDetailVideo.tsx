import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { AppHeader, COLORS, FONT, StatusBadge } from "../screens/shared";

const EXPERIENCE = [
  { title: "Senior Frontend Engineer", company: "Stripe", duration: "2021 – Present", desc: "Led React architecture for payment dashboards." },
  { title: "Full Stack Developer", company: "Vercel", duration: "2019 – 2021", desc: "Built deployment pipeline and Next.js integrations." },
];

const NOTES = [
  { author: "Henrique C.", time: "2 days ago", text: "Strong culture fit. Moving to final round." },
  { author: "Ana M.", time: "1 week ago", text: "Technical interview went well. Deep React knowledge." },
];

export const CandidateDetailVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const contentProgress = spring({ frame, fps, config: { damping: 200 } });
  const contentOpacity = interpolate(contentProgress, [0, 1], [0, 1]);
  const contentY = interpolate(contentProgress, [0, 1], [12, 0]);

  // Scroll simulation - content moves up over time
  const scrollY = interpolate(frame, [40, 90], [0, 180], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: COLORS.black, fontFamily: FONT }}>
      <AppHeader activeNav="Candidates" />

      <div style={{
        flex: 1, padding: "12px 12px", opacity: contentOpacity,
        transform: `translateY(${contentY}px)`,
        display: "flex", flexDirection: "column", gap: 0, overflow: "hidden",
      }}>
        {/* Inner scrollable content */}
        <div style={{ transform: `translateY(-${scrollY}px)`, display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Back + actions row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, color: COLORS.gray400 }}>← Back</span>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{
                padding: "4px 10px", borderRadius: 6,
                background: COLORS.white, color: COLORS.black,
                fontSize: 9, fontWeight: 500,
              }}>✉ Send Email</div>
              <div style={{
                padding: "4px 10px", borderRadius: 6,
                border: `1px solid ${COLORS.borderStrong}`,
                color: COLORS.white, fontSize: 9, fontWeight: 500,
              }}>Edit</div>
            </div>
          </div>

          {/* Profile Card */}
          <div style={{
            background: COLORS.gray900, border: `1px solid ${COLORS.borderStrong}`,
            borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
          }}>
            {/* Avatar */}
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "linear-gradient(135deg, #374151, #1f2937)",
              border: `2px solid ${COLORS.borderStrong}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 500, color: COLORS.gray300,
            }}>SC</div>
            <div style={{ textAlign: "center" as const }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: COLORS.white, letterSpacing: "-0.02em" }}>Sarah Chen</div>
              <div style={{ fontSize: 10, color: COLORS.gray400, marginTop: 2 }}>Senior Full Stack Engineer</div>
            </div>
            <StatusBadge status="interviewing" />

            {/* Contact info */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: COLORS.gray400 }}>
                <span>✉</span><span>sarah.chen@email.com</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: COLORS.gray400 }}>
                <span>🔗</span><span>linkedin.com/in/sarahchen</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: COLORS.gray500 }}>
                <span>📅</span><span>Added 2 days ago · LinkedIn</span>
              </div>
            </div>

            {/* Skills */}
            <div style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
              {["React", "Node.js", "TypeScript", "AWS", "PostgreSQL"].map((s) => (
                <span key={s} style={{
                  background: COLORS.gray800, border: `1px solid ${COLORS.border}`,
                  color: COLORS.gray300, padding: "2px 8px", borderRadius: 100, fontSize: 9,
                }}>{s}</span>
              ))}
            </div>
          </div>

          {/* About section */}
          <div style={{
            background: COLORS.gray900, border: `1px solid ${COLORS.borderStrong}`,
            borderRadius: 12, padding: 14,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.white, marginBottom: 6 }}>About</div>
            <div style={{ fontSize: 9, color: COLORS.gray400, lineHeight: 1.6 }}>
              Full-stack engineer with 6+ years of experience building scalable web applications.
              Passionate about clean code, performance optimization, and developer tooling.
              Previously at Stripe and Vercel.
            </div>
          </div>

          {/* Experience */}
          <div style={{
            background: COLORS.gray900, border: `1px solid ${COLORS.borderStrong}`,
            borderRadius: 12, padding: 14,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.white, marginBottom: 10 }}>Experience</div>
            {EXPERIENCE.map((exp, i) => {
              const delay = 20 + i * 8;
              const p = spring({ frame, fps, delay, config: { damping: 200 } });
              const op = interpolate(p, [0, 1], [0, 1]);
              return (
                <div key={i} style={{
                  opacity: op,
                  display: "flex", gap: 10, marginBottom: i < EXPERIENCE.length - 1 ? 12 : 0,
                }}>
                  {/* Timeline dot + line */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 10 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: COLORS.white, flexShrink: 0 }} />
                    {i < EXPERIENCE.length - 1 && <div style={{ width: 1, flex: 1, background: COLORS.borderStrong, marginTop: 4 }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.white }}>{exp.title}</div>
                    <div style={{ fontSize: 9, color: COLORS.white, marginTop: 1 }}>{exp.company}</div>
                    <div style={{ fontSize: 8, color: COLORS.gray500, marginTop: 1 }}>{exp.duration}</div>
                    <div style={{ fontSize: 8, color: COLORS.gray400, marginTop: 3, lineHeight: 1.5 }}>{exp.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Notes */}
          <div style={{
            background: COLORS.gray900, border: `1px solid ${COLORS.borderStrong}`,
            borderRadius: 12, padding: 14,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.white, marginBottom: 8 }}>Notes · {NOTES.length}</div>

            {/* Add note input */}
            <div style={{
              borderRadius: 6, border: `1px solid ${COLORS.borderStrong}`,
              background: COLORS.gray900, padding: "6px 8px", marginBottom: 10,
              height: 32,
            }}>
              <span style={{ fontSize: 9, color: COLORS.gray500 }}>Add a note...</span>
            </div>

            {NOTES.map((note, i) => {
              const delay = 36 + i * 8;
              const p = spring({ frame, fps, delay, config: { damping: 200 } });
              const op = interpolate(p, [0, 1], [0, 1]);
              return (
                <div key={i} style={{
                  opacity: op,
                  borderTop: i > 0 ? `1px solid ${COLORS.border}` : "none",
                  paddingTop: i > 0 ? 8 : 0,
                  marginTop: i > 0 ? 8 : 0,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 9, fontWeight: 500, color: COLORS.gray300 }}>{note.author}</span>
                    <span style={{ fontSize: 8, color: COLORS.gray500 }}>{note.time}</span>
                  </div>
                  <div style={{ fontSize: 9, color: COLORS.gray400, marginTop: 3, lineHeight: 1.5 }}>{note.text}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
