import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { AppHeader, COLORS, FONT, StatusBadge, SourceBadge } from "./shared";

const CANDIDATES = [
  {
    name: "Sarah Chen",
    status: "interviewing",
    email: "sarah@email.com",
    source: "LinkedIn",
    skills: ["React", "Node.js", "TypeScript", "AWS"],
    time: "2 days ago",
  },
  {
    name: "Marcus Rivera",
    status: "new",
    email: "marcus@email.com",
    source: "Extension",
    skills: ["Python", "PyTorch", "MLOps", "GCP"],
    time: "3 days ago",
  },
  {
    name: "Emily Park",
    status: "contacted",
    email: "emily@email.com",
    source: "Gmail",
    skills: ["Figma", "UI/UX", "Design Systems"],
    time: "5 days ago",
  },
  {
    name: "James Wilson",
    status: "hired",
    email: "james@email.com",
    source: "LinkedIn",
    skills: ["Go", "Kubernetes", "Terraform"],
    time: "1 week ago",
  },
  {
    name: "Aisha Patel",
    status: "new",
    email: "aisha@email.com",
    source: "CSV Import",
    skills: ["Java", "Spring", "PostgreSQL", "Redis"],
    time: "1 week ago",
  },
];

export const CandidatesScreen: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const contentProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });
  const contentOpacity = interpolate(contentProgress, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ background: COLORS.black, fontFamily: FONT }}>
      <AppHeader activeNav="Candidates" />

      <div
        style={{
          flex: 1,
          padding: "16px 12px",
          opacity: contentOpacity,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          overflow: "hidden",
        }}
      >
        {/* Page header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 500,
                letterSpacing: "-0.035em",
                color: COLORS.white,
              }}
            >
              Candidates
            </div>
            <div style={{ fontSize: 10, color: COLORS.gray400, marginTop: 2 }}>
              284 total candidates
            </div>
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 10px",
              borderRadius: 6,
              background: COLORS.white,
              color: COLORS.black,
              fontSize: 10,
              fontWeight: 500,
            }}
          >
            + Add Candidate
          </div>
        </div>

        {/* Search + Filters */}
        <div style={{ display: "flex", gap: 6 }}>
          <div
            style={{
              flex: 1,
              height: 30,
              borderRadius: 6,
              border: `1px solid ${COLORS.borderStrong}`,
              background: COLORS.gray900,
              padding: "0 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 10, color: COLORS.gray500 }}>🔍</span>
            <span style={{ fontSize: 10, color: COLORS.gray500 }}>
              Search candidates...
            </span>
          </div>
          <div
            style={{
              height: 30,
              borderRadius: 6,
              border: `1px solid ${COLORS.borderStrong}`,
              background: COLORS.gray900,
              padding: "0 10px",
              display: "flex",
              alignItems: "center",
              fontSize: 10,
              color: COLORS.gray400,
            }}
          >
            All Statuses
          </div>
        </div>

        {/* Candidate cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {CANDIDATES.map((c, i) => {
            const delay = 4 + i * 3;
            const cardProgress = spring({
              frame,
              fps,
              delay,
              config: { damping: 200 },
            });
            const cardOpacity = interpolate(cardProgress, [0, 1], [0, 1]);
            const cardX = interpolate(cardProgress, [0, 1], [20, 0]);

            return (
              <div
                key={c.name}
                style={{
                  opacity: cardOpacity,
                  transform: `translateX(${cardX}px)`,
                  background: COLORS.gray900,
                  border: `1px solid ${COLORS.borderStrong}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                  display: "flex",
                  gap: 10,
                }}
              >
                {/* Checkbox */}
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 3,
                    border: `1.5px solid ${COLORS.borderStrong}`,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Name + Status */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: COLORS.white,
                      }}
                    >
                      {c.name}
                    </span>
                    <StatusBadge status={c.status} />
                  </div>

                  {/* Email + Source */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 9,
                        color: COLORS.gray400,
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      ✉ {c.email}
                    </span>
                    <SourceBadge source={c.source} />
                  </div>

                  {/* Skills */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 4,
                      marginTop: 7,
                    }}
                  >
                    {c.skills.map((skill) => (
                      <span
                        key={skill}
                        style={{
                          background: COLORS.gray800,
                          color: COLORS.gray400,
                          padding: "2px 7px",
                          borderRadius: 100,
                          fontSize: 9,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 8,
                    }}
                  >
                    <span style={{ fontSize: 8, color: COLORS.gray500 }}>
                      Added {c.time}
                    </span>
                    <span style={{ fontSize: 10, color: COLORS.danger }}>
                      🗑
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
