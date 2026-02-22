import { Composition } from "remotion";
import { WharfDemo } from "./WharfDemo";
import { DashboardHomeVideo } from "./videos/DashboardHomeVideo";
import { CandidatesListVideo } from "./videos/CandidatesListVideo";
import { AIMatchVideo } from "./videos/AIMatchVideo";
import { CandidateDetailVideo } from "./videos/CandidateDetailVideo";
import { EmailComposerVideo } from "./videos/EmailComposerVideo";
import { CSVImportVideo } from "./videos/CSVImportVideo";
import { ExtensionLinkedInVideo } from "./videos/ExtensionLinkedInVideo";
import { ExtensionGmailVideo } from "./videos/ExtensionGmailVideo";
import { FullDemoVideo } from "./videos/FullDemoVideo";

const W = 437;
const H = 797;
const FPS = 30;
const DUR = 120; // 4 seconds at 30fps

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 15s full demo — 4:3 */}
      <Composition
        id="FullDemo"
        component={FullDemoVideo}
        durationInFrames={450}
        fps={FPS}
        width={1024}
        height={768}
      />

      {/* Original combined demo */}
      <Composition
        id="WharfDemo"
        component={WharfDemo}
        durationInFrames={150}
        fps={FPS}
        width={W}
        height={H}
      />

      {/* Individual feature videos */}
      <Composition
        id="DashboardHome"
        component={DashboardHomeVideo}
        durationInFrames={DUR}
        fps={FPS}
        width={W}
        height={H}
      />
      <Composition
        id="CandidatesList"
        component={CandidatesListVideo}
        durationInFrames={DUR}
        fps={FPS}
        width={W}
        height={H}
      />
      <Composition
        id="AIMatch"
        component={AIMatchVideo}
        durationInFrames={DUR}
        fps={FPS}
        width={W}
        height={H}
      />
      <Composition
        id="CandidateDetail"
        component={CandidateDetailVideo}
        durationInFrames={DUR}
        fps={FPS}
        width={W}
        height={H}
      />
      <Composition
        id="EmailComposer"
        component={EmailComposerVideo}
        durationInFrames={DUR}
        fps={FPS}
        width={W}
        height={H}
      />
      <Composition
        id="CSVImport"
        component={CSVImportVideo}
        durationInFrames={DUR}
        fps={FPS}
        width={W}
        height={H}
      />
      <Composition
        id="ExtensionLinkedIn"
        component={ExtensionLinkedInVideo}
        durationInFrames={DUR}
        fps={FPS}
        width={W}
        height={H}
      />
      <Composition
        id="ExtensionGmail"
        component={ExtensionGmailVideo}
        durationInFrames={DUR}
        fps={FPS}
        width={W}
        height={H}
      />
    </>
  );
};
