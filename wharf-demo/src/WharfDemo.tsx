import { AbsoluteFill, Sequence } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { HomeScreen } from "./screens/HomeScreen";
import { CandidatesScreen } from "./screens/CandidatesScreen";
import { AIMatchScreen } from "./screens/AIMatchScreen";

export const WharfDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#0A0A0A" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={50}>
          <HomeScreen />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 8 })}
        />

        <TransitionSeries.Sequence durationInFrames={50}>
          <CandidatesScreen />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: 8 })}
        />

        <TransitionSeries.Sequence durationInFrames={66}>
          <AIMatchScreen />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
