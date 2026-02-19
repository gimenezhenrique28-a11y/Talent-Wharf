import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { AppHeader, COLORS, FONT } from "../screens/shared";

const KPI_CARDS = [
  { label: "Total Candidates", value: "284" },
  { label: "Added This Week", value: "14" },
  { label: "Interviewing", value: "8" },
  { label: "Hired", value: "3" },
];

export const DashboardHomeVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const contentProgress = spring({ frame, fps, config: { damping: 200 } });
  const contentOpacity = interpolate(contentProgress, [0, 1], [0, 1]);
  const contentY = interpolate(contentProgress, [0, 1], [15, 0]);

  return (
    <AbsoluteFill style={{ background: COLORS.black, fontFamily: FONT }}>
      <AppHeader activeNav="Home" />

      <div
        style={{
          flex: 1,
          padding: "20px 16px",
          opacity: contentOpacity,
          transform: `translateY(${contentY}px)`,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Welcome */}
        <div>
          <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.035em", lineHeight: 1.2, color: COLORS.white }}>
            Good to see you, Henrique.
          </div>
          <div style={{ color: COLORS.gray400, marginTop: 4, fontSize: 11, letterSpacing: "-0.011em" }}>
            Your recruitment pipeline at a glance.
          </div>
        </div>

        {/* KPI Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {KPI_CARDS.map((kpi, i) => {
            const delay = 6 + i * 4;
            const p = spring({ frame, fps, delay, config: { damping: 200 } });
            const op = interpolate(p, [0, 1], [0, 1]);
            const y = interpolate(p, [0, 1], [12, 0]);
            // Count up animation
            const val = parseInt(kpi.value);
            const counted = Math.round(
              interpolate(frame, [delay + 2, delay + 20], [0, val], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              })
            );

            return (
              <div
                key={kpi.label}
                style={{
                  opacity: op,
                  transform: `translateY(${y}px)`,
                  background: COLORS.gray900,
                  border: `1px solid ${COLORS.borderStrong}`,
                  borderRadius: 12,
                  padding: "16px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: COLORS.gray800, border: `1px solid ${COLORS.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  <div style={{ width: 14, height: 14, borderRadius: 3, border: `1.5px solid ${COLORS.gray300}` }} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.04em", lineHeight: 1, color: COLORS.white }}>
                    {counted}
                  </div>
                  <div style={{ fontSize: 9, color: COLORS.gray400, marginTop: 3, letterSpacing: "-0.011em" }}>
                    {kpi.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Job Matching card */}
        {(() => {
          const cardP = spring({ frame, fps, delay: 24, config: { damping: 200 } });
          const cardOp = interpolate(cardP, [0, 1], [0, 1]);
          const cardY = interpolate(cardP, [0, 1], [15, 0]);
          return (
            <div
              style={{
                opacity: cardOp,
                transform: `translateY(${cardY}px)`,
                background: COLORS.gray900,
                border: `1px solid ${COLORS.borderStrong}`,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6,
                  background: COLORS.gray800, border: `1px solid ${COLORS.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 12, color: COLORS.gray300,
                }}>✦</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, letterSpacing: "-0.02em", color: COLORS.white }}>
                    AI Job Matching
                  </div>
                  <div style={{ color: COLORS.gray400, marginTop: 2, fontSize: 10, letterSpacing: "-0.011em" }}>
                    Paste a job description and AI will rank your best matching candidates.
                  </div>
                </div>
              </div>

              <div style={{
                width: "100%", height: 100, borderRadius: 6,
                border: `1px solid ${COLORS.borderStrong}`, background: COLORS.gray900,
                padding: "8px 10px", marginBottom: 10,
              }}>
                <span style={{ fontSize: 10, color: COLORS.gray500 }}>Paste a job description here...</span>
              </div>

              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 6,
                background: COLORS.white, color: COLORS.black,
                fontSize: 11, fontWeight: 500, letterSpacing: "-0.006em",
              }}>✦ Find Best Matches</div>
            </div>
          );
        })()}
      </div>
    </AbsoluteFill>
  );
};
