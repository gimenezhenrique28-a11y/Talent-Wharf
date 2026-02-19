import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { AppHeader, COLORS, FONT } from "../screens/shared";

export const CSVImportVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const contentProgress = spring({ frame, fps, config: { damping: 200 } });
  const contentOpacity = interpolate(contentProgress, [0, 1], [0, 1]);
  const contentY = interpolate(contentProgress, [0, 1], [12, 0]);

  // File appears in dropzone
  const fileAppears = frame >= 30;
  const fileP = fileAppears ? spring({ frame, fps, delay: 30, config: { damping: 200 } }) : 0;

  // Processing bar
  const isProcessing = frame >= 50 && frame < 80;
  const processWidth = interpolate(frame, [50, 80], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Results appear
  const showResults = frame >= 82;

  return (
    <AbsoluteFill style={{ background: COLORS.black, fontFamily: FONT }}>
      <AppHeader activeNav="Import" />

      <div style={{
        flex: 1, padding: "16px 12px", opacity: contentOpacity,
        transform: `translateY(${contentY}px)`,
        display: "flex", flexDirection: "column", gap: 14, overflow: "hidden",
      }}>
        {/* Page header */}
        <div>
          <div style={{ fontSize: 18, fontWeight: 500, letterSpacing: "-0.035em", color: COLORS.white }}>Import CSV</div>
          <div style={{ fontSize: 10, color: COLORS.gray400, marginTop: 2 }}>Bulk import candidates from a spreadsheet.</div>
        </div>

        {/* Template download card */}
        <div style={{
          background: COLORS.gray900, border: `1px solid ${COLORS.borderStrong}`,
          borderRadius: 12, padding: 14,
        }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.white, marginBottom: 6 }}>Download Template</div>
          <div style={{ fontSize: 9, color: COLORS.gray400, lineHeight: 1.6, marginBottom: 10 }}>
            Required: name, email · Optional: headline, linkedin_url, skills, about, source, notes
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 12px", borderRadius: 6,
            border: `1px solid ${COLORS.borderStrong}`, color: COLORS.white,
            fontSize: 10, fontWeight: 500,
          }}>↓ Download Template</div>
        </div>

        {/* Upload dropzone */}
        <div style={{
          background: COLORS.gray900, border: `2px dashed ${fileAppears ? COLORS.white : COLORS.borderStrong}`,
          borderRadius: 12, padding: fileAppears ? "14px" : "28px 14px",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 8,
          transition: "border-color 0.2s",
        }}>
          {!fileAppears ? (
            <>
              <div style={{ fontSize: 20, color: COLORS.gray500 }}>📁</div>
              <div style={{ fontSize: 10, color: COLORS.gray400, textAlign: "center" as const }}>
                Drop your CSV file here or click to browse
              </div>
              <div style={{ fontSize: 8, color: COLORS.gray500 }}>.csv files only</div>
            </>
          ) : (
            <div style={{
              opacity: interpolate(fileP as number, [0, 1], [0, 1]),
              transform: `scale(${interpolate(fileP as number, [0, 1], [0.9, 1])})`,
              display: "flex", alignItems: "center", gap: 10, width: "100%",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: COLORS.gray800, border: `1px solid ${COLORS.border}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14,
              }}>📄</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: COLORS.white }}>candidates-batch.csv</div>
                <div style={{ fontSize: 8, color: COLORS.gray500 }}>24.3 KB · 47 rows</div>
              </div>
              <span style={{ fontSize: 10, color: COLORS.gray500 }}>✕</span>
            </div>
          )}
        </div>

        {/* Import button + progress */}
        {fileAppears && !showResults && (
          <div>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "8px 14px", borderRadius: 6,
              background: isProcessing ? COLORS.gray800 : COLORS.white,
              color: isProcessing ? COLORS.white : COLORS.black,
              fontSize: 11, fontWeight: 500, marginBottom: isProcessing ? 8 : 0,
            }}>
              {isProcessing ? "⟳ Importing..." : "Import Candidates"}
            </div>
            {isProcessing && (
              <div style={{
                height: 3, borderRadius: 2, background: COLORS.gray800, overflow: "hidden",
              }}>
                <div style={{
                  height: "100%", width: `${processWidth}%`,
                  background: COLORS.white, borderRadius: 2,
                }} />
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {showResults && (() => {
          const results = [
            { label: "Imported", value: "42", color: COLORS.success, bg: COLORS.successSubtle },
            { label: "Duplicates", value: "3", color: COLORS.warning, bg: COLORS.warningSubtle },
            { label: "Failed", value: "2", color: COLORS.danger, bg: COLORS.dangerSubtle },
          ];
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {results.map((r, i) => {
                  const delay = 82 + i * 4;
                  const rP = spring({ frame, fps, delay, config: { damping: 200 } });
                  const rOp = interpolate(rP, [0, 1], [0, 1]);
                  const rScale = interpolate(rP, [0, 1], [0.9, 1]);
                  return (
                    <div key={r.label} style={{
                      opacity: rOp, transform: `scale(${rScale})`,
                      background: r.bg, border: `1px solid ${r.color}30`,
                      borderRadius: 10, padding: "12px 10px", textAlign: "center" as const,
                    }}>
                      <div style={{ fontSize: 22, fontWeight: 500, color: r.color, letterSpacing: "-0.04em" }}>{r.value}</div>
                      <div style={{ fontSize: 9, color: r.color, marginTop: 2, opacity: 0.8 }}>{r.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* View candidates button */}
              {frame >= 100 && (() => {
                const btnP = spring({ frame, fps, delay: 100, config: { damping: 200 } });
                return (
                  <div style={{
                    opacity: interpolate(btnP, [0, 1], [0, 1]),
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "8px 14px", borderRadius: 6,
                    background: COLORS.white, color: COLORS.black,
                    fontSize: 11, fontWeight: 500,
                  }}>View All Candidates</div>
                );
              })()}
            </div>
          );
        })()}
      </div>
    </AbsoluteFill>
  );
};
