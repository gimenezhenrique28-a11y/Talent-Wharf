import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

// Import new 6-scene components
import { HookScene } from "./scenes/HookScene";
import { MessageScene } from "./scenes/MessageScene";
import { DashboardSaveScene } from "./scenes/DashboardSaveScene";
import { TimeSkipScene } from "./scenes/TimeSkipScene";
import { MatchingScene } from "./scenes/MatchingScene";
import { OutroScene } from "./scenes/OutroScene";

/**
 * BeliefDemo: Dopamine-Spike Product Demo Video
 *
 * Duration: ~30 seconds (900 frames at 30fps)
 * Aspect Ratio: 4:3 (1024×768) for LinkedIn
 *
 * Story: Founder receives cold message → saves it → time passes → finds them in talent bank when hiring
 *
 * Scenes:
 * 1. Hook (90f) - "You got a cold message" + notification pop
 * 2. Message (60f) - LinkedIn DM interface
 * 3. Dashboard Save (120f) - Extension popup appears, saving candidate
 * 4. Time Skip (60f) - "3 months later"
 * 5. Matching (120f) - Job description + same person as top match
 * 6. Outro (120f) - HUGE WharfWordmark logo + tagline
 * Total: ~900 frames (fast transitions included)
 */
export const BeliefDemoVideo: React.FC = () => {
  const TRANSITION_DURATION = 3; // 3 frames per fade transition (fast cuts)

  return (
    <AbsoluteFill style={{ background: "#000000" }}>
      <TransitionSeries>
        {/* Scene 1: Hook */}
        <TransitionSeries.Sequence durationInFrames={90}>
          <HookScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 2: LinkedIn Message */}
        <TransitionSeries.Sequence durationInFrames={60}>
          <MessageScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 3: Dashboard Save */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <DashboardSaveScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 4: Time Skip */}
        <TransitionSeries.Sequence durationInFrames={60}>
          <TimeSkipScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 5: Matching */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <MatchingScene />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: TRANSITION_DURATION })}
        />

        {/* Scene 6: Outro */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
