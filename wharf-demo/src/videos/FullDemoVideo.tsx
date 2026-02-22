import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { DashboardHomeVideo } from "./DashboardHomeVideo";
import { CandidatesListVideo } from "./CandidatesListVideo";
import { AIMatchVideo } from "./AIMatchVideo";
import { CandidateDetailVideo } from "./CandidateDetailVideo";
import { EmailComposerVideo } from "./EmailComposerVideo";
import { CSVImportVideo } from "./CSVImportVideo";
import { ExtensionLinkedInVideo } from "./ExtensionLinkedInVideo";
import { ExtensionGmailVideo } from "./ExtensionGmailVideo";
import { COLORS, FONT } from "../screens/shared";

// TW logo mark — exact recreation of the attached brand icon
const TWLogo: React.FC<{ size?: number }> = ({ size = 220 }) => (
  <svg viewBox="0 0 200 200" width={size} height={size}>
    <rect width="200" height="200" fill={COLORS.black} />
    {/* T crossbar */}
    <rect x="40" y="42" width="120" height="28" fill={COLORS.white} />
    {/* T stem merging into W — the vertical drops into the W shape */}
    <rect x="80" y="42" width="40" height="40" fill={COLORS.white} />
    {/* W shape — 4 diagonal strokes forming the W below */}
    <polygon points="45,82 70,158 85,158 100,110" fill={COLORS.white} />
    <polygon points="100,110 115,158 130,158 155,82" fill={COLORS.white} />
  </svg>
);

const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoP = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const logoScale = interpolate(logoP, [0, 1], [0.7, 1]);
  const logoOpacity = interpolate(logoP, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ background: COLORS.black, fontFamily: FONT, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <div style={{ opacity: logoOpacity, transform: `scale(${logoScale})`, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <TWLogo size={200} />
      </div>
    </AbsoluteFill>
  );
};

export const FullDemoVideo: React.FC = () => {
  // 15s = 450 frames at 30fps
  // 8 screens ~48f each + outro 66f, minus transitions
  const T = 6; // transition duration

  return (
    <AbsoluteFill style={{ background: COLORS.black }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={52}>
          <DashboardHomeVideo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={52}>
          <CandidatesListVideo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={58}>
          <AIMatchVideo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={52}>
          <CandidateDetailVideo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={48}>
          <EmailComposerVideo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={52}>
          <CSVImportVideo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={48}>
          <ExtensionLinkedInVideo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={48}>
          <ExtensionGmailVideo />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: T })} />

        <TransitionSeries.Sequence durationInFrames={90}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
