import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { AppHeader, COLORS, FONT } from "../screens/shared";

const MATCHES = [
  { name: "Sarah Chen", score: 94, skills: ["React", "Node.js", "TypeScript"], reasoning: "Strong match on full-stack skills, 6+ years experience with React and Node.js." },
  { name: "Alex Kim", score: 87, skills: ["React", "Python", "AWS"], reasoning: "Excellent cloud architecture experience. Strong React skills." },
  { name: "Jordan Lee", score: 81, skills: ["TypeScript", "GraphQL", "Docker"], reasoning: "Solid TypeScript skills and relevant experience in scalable systems." },
];

export const AIMatchVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const contentProgress = spring({ frame, fps, config: { damping: 200 } });
  const contentOpacity = interpolate(contentProgress, [0, 1], [0, 1]);

  // Typing animation
  const JOB_TEXT = "Senior Full Stack Engineer - React, Node.js, TypeScript, 5+ years experience, team lead...";
  const typedChars = Math.min(
    Math.floor(interpolate(frame, [6, 36], [0, JOB_TEXT.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })),
    JOB_TEXT.length
  );
  const typedText = JOB_TEXT.slice(0, typedChars);
  const isTypingDone = frame >= 36;
  const isAnalyzing = frame >= 40 && frame < 54;
  const showResults = frame >= 54;
  const scanWidth = interpolate(frame, [40, 54], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: COLORS.black, fontFamily: FONT }}>
      <AppHeader activeNav="Home" />

      <div style={{
        flex: 1, padding: "16px 12px", opacity: contentOpacity,
        display: "flex", flexDirection: "column", gap: 12, overflow: "hidden",
      }}>
        {/* AI Matching Card */}
        <div style={{
          background: COLORS.gray900, border: `1px solid ${COLORS.borderStrong}`,
          borderRadius: 12, padding: 14,
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 26, height: 26, borderRadius: 6,
              background: COLORS.gray800, border: `1px solid ${COLORS.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, fontSize: 11, color: COLORS.gray300,
            }}>✦</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: "-0.02em", color: COLORS.white }}>AI Job Matching</div>
              <div style={{ color: COLORS.gray400, marginTop: 2, fontSize: 9 }}>
                Paste a job description and AI will rank your best matching candidates.
              </div>
            </div>
          </div>

          {/* Textarea with typing */}
          <div style={{
            width: "100%", minHeight: 70, borderRadius: 6,
            border: `1px solid ${COLORS.borderStrong}`, background: COLORS.gray900,
            padding: "8px 10px", marginBottom: 10, position: "relative", overflow: "hidden",
          }}>
            <span style={{ fontSize: 10, color: typedChars > 0 ? COLORS.white : COLORS.gray500, lineHeight: 1.5 }}>
              {typedChars > 0 ? typedText : "Paste a job description here..."}
              {typedChars > 0 && typedChars < JOB_TEXT.length && (
                <span style={{ display: "inline-block", width: 1, height: 12, background: COLORS.white, marginLeft: 1, verticalAlign: "text-bottom" }} />
              )}
            </span>
            {isAnalyzing && (
              <div style={{
                position: "absolute", bottom: 0, left: 0, height: 2,
                width: `${scanWidth}%`,
                background: `linear-gradient(90deg, ${COLORS.white}, ${COLORS.gray400})`,
                borderRadius: 1,
              }} />
            )}
          </div>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "6px 12px", borderRadius: 6,
            background: isAnalyzing ? COLORS.gray800 : COLORS.white,
            color: isAnalyzing ? COLORS.white : COLORS.black,
            fontSize: 10, fontWeight: 500, opacity: isTypingDone ? 1 : 0.4,
          }}>
            {isAnalyzing ? "⟳ Analysing candidates..." : "✦ Find Best Matches"}
          </div>
        </div>

        {/* Match Results */}
        {showResults && (
          <div>
            <div style={{
              fontSize: 8, fontWeight: 500, textTransform: "uppercase" as const,
              letterSpacing: "0.08em", color: COLORS.gray500, marginBottom: 8,
            }}>Top 3 matches</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MATCHES.map((match, i) => {
                const delay = 54 + i * 6;
                const cardP = spring({ frame, fps, delay, config: { damping: 200 } });
                const cardOp = interpolate(cardP, [0, 1], [0, 1]);
                const cardY = interpolate(cardP, [0, 1], [15, 0]);
                const scoreAnimated = interpolate(frame, [delay + 2, delay + 12], [0, match.score], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

                return (
                  <div key={match.name} style={{
                    opacity: cardOp, transform: `translateY(${cardY}px)`,
                    background: COLORS.gray900, border: `1px solid ${COLORS.borderStrong}`,
                    borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10,
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: COLORS.gray800, border: `1px solid ${COLORS.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 500, color: COLORS.gray400, flexShrink: 0,
                    }}>{i + 1}</div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: COLORS.white, letterSpacing: "-0.02em" }}>{match.name}</div>
                        <div style={{ textAlign: "center" as const, flexShrink: 0 }}>
                          <div style={{ fontSize: 18, fontWeight: 500, color: COLORS.white, letterSpacing: "-0.04em", lineHeight: 1 }}>
                            {Math.round(scoreAnimated)}
                          </div>
                          <div style={{ fontSize: 7, color: COLORS.gray500, marginTop: 1 }}>/ 100</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {match.skills.map((skill) => (
                          <span key={skill} style={{
                            background: COLORS.gray800, border: `1px solid ${COLORS.border}`,
                            color: COLORS.gray300, padding: "2px 7px", borderRadius: 100, fontSize: 8, fontWeight: 400,
                          }}>{skill}</span>
                        ))}
                      </div>
                      <div style={{
                        marginTop: 6, background: COLORS.gray800, borderRadius: 6,
                        padding: "6px 8px", fontSize: 8, color: COLORS.gray400, lineHeight: 1.5,
                      }}>{match.reasoning}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
