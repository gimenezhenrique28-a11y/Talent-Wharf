import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { AppHeader, COLORS, FONT, StatusBadge, SourceBadge } from "../screens/shared";

/**
 * Scene 5: Search & Candidate Match (4 seconds, 120 frames)
 * Show job opening, then multiple candidates with Sarah Kim (from MessageScene) as top match
 * Emotional payoff: they find the person they saved earlier is a perfect fit
 */
export const MatchingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Page fade in
  const contentProgress = spring({ frame, fps, config: { damping: 200 } });
  const contentOpacity = interpolate(contentProgress, [0, 1], [0, 1]);

  // Job description typing animation
  const jobText = "Senior Full Stack Engineer";
  const typingFrame = Math.min(frame - 5, 40);
  const typedLength = Math.max(0, Math.round((typingFrame / 40) * jobText.length));
  const jobTyped = jobText.substring(0, typedLength);

  // Results appear at frame 50+
  const showResults = frame >= 50;
  const resultP = showResults ? spring({ frame, fps, delay: 50, config: { damping: 200 } }) : 0;
  const resultOpacity = interpolate(resultP as number, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  const CANDIDATES = [
    { name: "Sarah Kim", status: "new", email: "sarah.kim@email.com", source: "LinkedIn", skills: ["React", "Node.js", "TypeScript", "AWS"], score: 98, highlight: true },
    { name: "Marcus Rivera", status: "new", email: "marcus@email.com", source: "Extension", skills: ["Python", "FastAPI", "PostgreSQL"], score: 87, highlight: false },
    { name: "Emily Chen", status: "new", email: "emily@email.com", source: "LinkedIn", skills: ["Go", "Rust", "Kubernetes"], score: 82, highlight: false },
  ];

  return (
    <AbsoluteFill style={{ background: COLORS.black, fontFamily: FONT }}>
      <AppHeader activeNav="Home" />

      <div
        style={{
          flex: 1,
          padding: "16px 12px",
          opacity: contentOpacity,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          overflow: "auto",
        }}
      >
        {/* Job Description Section */}
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: COLORS.gray400,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: "-0.006em",
            }}
          >
            Searching for
          </div>
          <div
            style={{
              padding: "12px 14px",
              background: COLORS.gray900,
              border: `1px solid ${COLORS.borderStrong}`,
              borderRadius: 8,
              fontSize: 13,
              color: COLORS.white,
              minHeight: 32,
              fontWeight: 500,
            }}
          >
            {jobTyped}
            {typedLength < jobText.length && (
              <span style={{ color: COLORS.gray600, marginLeft: 2 }}>|</span>
            )}
          </div>
        </div>

        {/* Candidates List */}
        {showResults && (
          <div
            style={{
              opacity: resultOpacity,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: COLORS.gray400,
                textTransform: "uppercase",
                letterSpacing: "-0.006em",
              }}
            >
              Best Matches
            </div>

            {/* Candidate Cards */}
            {CANDIDATES.map((candidate, idx) => {
              const cardDelay = 50 + idx * 8;
              const cardP = spring({ frame, fps, delay: cardDelay, config: { damping: 200 } });
              const cardOpacity = interpolate(cardP, [0, 1], [0, 1], { extrapolateRight: "clamp" });
              const cardX = interpolate(cardP, [0, 1], [16, 0], { extrapolateRight: "clamp" });

              return (
                <div
                  key={candidate.name}
                  style={{
                    opacity: cardOpacity,
                    transform: `translateX(${cardX}px)`,
                    background: COLORS.gray900,
                    border: `1px solid ${candidate.highlight ? COLORS.white : COLORS.borderStrong}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: `hsl(${(idx * 120) % 360}, 70%, 50%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: COLORS.white,
                      fontWeight: 600,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {candidate.name.charAt(0)}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: COLORS.white,
                          letterSpacing: "-0.024em",
                        }}
                      >
                        {candidate.name}
                      </span>
                      <StatusBadge status={candidate.status} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 9, color: COLORS.gray400 }}>✉ {candidate.email}</span>
                      <SourceBadge source={candidate.source} />
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                      {candidate.skills.map((skill) => (
                        <span
                          key={skill}
                          style={{
                            background: COLORS.gray800,
                            color: COLORS.gray400,
                            padding: "2px 7px",
                            borderRadius: 100,
                            fontSize: 9,
                            fontWeight: 500,
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                    {candidate.highlight && (
                      <div style={{ fontSize: 10, color: COLORS.success, fontWeight: 500 }}>
                        ✅ Previously expressed interest
                      </div>
                    )}
                  </div>

                  {/* Match Score */}
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color: COLORS.white,
                      flexShrink: 0,
                      minWidth: 40,
                      textAlign: "right",
                    }}
                  >
                    {candidate.score}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
