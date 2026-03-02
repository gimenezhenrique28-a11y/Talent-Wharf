# Prompt: Create YC-Style Demo Video for TalentWharf

Copy everything below the line and paste it into a new Claude Code session in the `wharf-demo/` directory.

---

## Context

I have an existing Remotion project in this directory (`wharf-demo/`) that generates demo videos for TalentWharf — a recruiting tool for startups. The project already has working compositions, a shared design system (`src/screens/shared.tsx`), and a `FullDemoVideo.tsx` that renders 8 scenes + an outro.

I need you to **create a new composition** called `BeliefDemo` — a 45-60 second YC-style product demo video that tells a story, not just shows features. This video will be used on our landing page and for beta launch content on LinkedIn.

## The Narrative

TalentWharf's core belief: **Culture fit starts with the first message.** Great people reach out to startups all the time — LinkedIn DMs, cold emails — saying "I love what you're building." But those messages get buried. When it's time to hire, founders start from zero. TalentWharf captures that inbound interest and remembers great people, so when a role opens, the best candidates are already waiting.

The video follows a **Problem → Solution → Proof → CTA** arc.

## Technical Specs

- **Resolution:** 1920x1080 (16:9, HD) — this is for landing page / LinkedIn, not a mobile preview
- **FPS:** 30
- **Duration:** 45-60 seconds (1350-1800 frames). Target ~50 seconds (1500 frames)
- **Format:** Register as a new composition in Root.tsx called `BeliefDemo`
- **Transitions:** Use `@remotion/transitions` with `TransitionSeries` — alternate between fade and slide transitions (like the existing `FullDemoVideo.tsx`)
- **Animations:** Use `spring()` and `interpolate()` from Remotion — follow the existing patterns in the codebase
- **Colors:** Use the existing `COLORS` from `src/screens/shared.tsx` (dark theme, #0A0A0A background)
- **Font:** Use the existing system font stack from shared.tsx
- **No external images or assets.** Everything must be built with React components, SVGs, and CSS. This is critical — all screenshots must be recreated as pixel-accurate React components.

## Scene-by-Scene Breakdown

### Scene 1: The Hook (4-5 seconds, ~135 frames)
**Content:** Bold kinetic typography on dark background.
**Text sequence (staggered fade-in, one line at a time):**
1. `"The best hires don't come from job boards."` (appears first, centered, large)
2. `"They already messaged you."` (appears below, slightly delayed, emphasized — maybe a different color accent like #6ee7b7 success green or a warm amber)

**Animation:** Each line fades in with spring + translateY. Second line has a slight delay (8-10 frames after first). Hold for ~2 seconds after both are visible.
**Font size:** First line ~42px, second line ~48px bold.
**Vibe:** Confident, provocative. This should stop the scroll.

### Scene 2: The Problem — LinkedIn DMs (6-8 seconds, ~210 frames)
**Content:** A realistic LinkedIn messages/DMs inbox view showing messages getting buried.

**CRITICAL: This must look like real LinkedIn.** Build a React component that recreates the LinkedIn messaging interface:
- **Top bar:** LinkedIn blue (#0A66C2) logo, search bar, nav icons (Home, Network, Jobs, Messaging with notification badge, Notifications), profile avatar
- **Left sidebar:** Message thread list with multiple conversations. Each thread shows: avatar circle with initials, name, preview text, timestamp
- **Main area:** An open conversation thread

**The story in this scene:**
1. First, we see a DM conversation open. The message is from "Alex Torres" and reads:
   > "Hey! I've been following your product for a while and I'm really impressed with what you're building. I'm a senior engineer at [company] and would love to chat if you're ever hiring. No rush — just wanted to put it out there."
2. The founder reads it, but doesn't act (maybe a brief pause).
3. Then time passes — animate a visual indicator: a subtle clock or calendar animation, or the timestamp changing from "Just now" to "3 months ago".
4. New messages pile on top — the thread list scrolls up, pushing Alex's conversation down and out of view. Show 5-8 new message previews sliding in from the top, pushing the original message off-screen.
5. The message is gone. Lost.

**Animation details:**
- Message thread list items slide in from top with stagger (like a real inbox filling up)
- Alex's thread gets pushed further and further down
- Optional: Slight blur or dim on the lost message as it scrolls off
- End state: Alex's message is no longer visible in the thread list

**LinkedIn styling reference (must match closely):**
- Background: #FFFFFF (or LinkedIn's light gray #F3F2EF for the page)
- Message bubbles: Light gray for received (#F2F2F2), blue (#0A66C2) for sent
- Font: System font, 14px body, 12px timestamps (gray #666666)
- Avatar circles: Colored backgrounds with white initials
- Thread list item: Name in semi-bold, preview in gray, timestamp aligned right
- Active thread: Light blue highlight (#EBF5FF)
- The overall layout should feel like you're looking at a real LinkedIn Messaging page

### Scene 3: The Problem — Email (4-5 seconds, ~135 frames)
**Content:** A realistic Gmail inbox showing a similar situation.

**Gmail inbox view:**
- **Top bar:** Gmail logo, search bar
- **Left sidebar:** Compose button, Inbox (with count), Starred, Sent, Drafts
- **Email list:** Rows of emails with: checkbox, star, sender name, subject, preview, timestamp

**The story:**
1. Show an email from "Priya Sharma" with subject: "Interested in joining your team"
2. It's visible in the inbox, highlighted/unread
3. Quick time-skip animation (like Scene 2)
4. New emails pile in above it — the email scrolls down and eventually out of the visible area
5. Lost again.

**Gmail styling reference:**
- Background: #FFFFFF
- Sidebar: #F6F8FC
- Email row hover: #F2F6FC
- Unread emails: Bold sender name, slightly different background
- Star: Yellow (#F4B400) when starred
- Red compose button
- Font: Google Sans or system font, 14px

### Scene 4: The Turn (3-4 seconds, ~105 frames)
**Content:** Dramatic pause. Dark screen. Typography.
**Text:** `"What if you never lost track of them?"` — centered, white on dark, fades in with spring animation.
**Then after a beat:** `"Meet TalentWharf."` — fades in below, maybe with the WharfWordmark SVG component (already exists in shared.tsx).
**Animation:** Text fades in, holds, then the whole screen transitions to the product.

### Scene 5: The Solution — LinkedIn Extension Capture (6-8 seconds, ~210 frames)
**Content:** A realistic LinkedIn PROFILE page (not DMs this time) with the TalentWharf extension popup appearing.

**LinkedIn profile page must look real:**
- **Top nav:** Same LinkedIn nav bar from Scene 2
- **Banner area:** A gradient or solid color banner (like LinkedIn default banners)
- **Profile card:**
  - Large avatar circle with initials "AT" (Alex Torres)
  - Name: "Alex Torres" (large, bold)
  - Headline: "Senior Full Stack Engineer at Vercel"
  - Location: "San Francisco Bay Area"
  - "500+ connections"
  - Action buttons: "Connect", "Message", "More"
- **About section:** 2-3 lines of bio text
- **Experience section:** 1-2 job entries with company logos (simple colored squares with initials)

**The story:**
1. LinkedIn profile is visible (Alex Torres — the same person from Scene 2!)
2. At ~frame 30, the TalentWharf extension popup slides in from the top-right corner (use the existing extension popup design from `ExtensionLinkedInVideo.tsx` but adapted for 1920x1080)
3. The extension shows:
   - Wharf wordmark header
   - Loading spinner + "Extracting LinkedIn profile..." (brief)
   - Then reveals: Alex Torres, Senior Full Stack Engineer, detected skills (React, Node.js, TypeScript, Next.js, AWS, PostgreSQL)
   - Big green "+ Add to Wharf" button
4. The button gets "clicked" (brief press animation)
5. Success state: Green checkmark, "Candidate added!" — the person is now saved

**Key detail:** This is the SAME person whose DM got lost in Scene 2. That emotional connection is the whole point. The viewer should feel "oh — they saved them this time."

### Scene 6: The Solution — Gmail Extension Capture (5-6 seconds, ~165 frames)
**Content:** A realistic Gmail email thread view with the TalentWharf extension popup.

**Gmail email view:**
- Email from "Priya Sharma" (the same person from Scene 3!)
- Subject: "Interested in joining your team"
- Email body visible with a warm, genuine message about wanting to work together
- The TalentWharf extension popup appears, extracts info, and captures Priya

**Same flow as Scene 5 but for Gmail.** Keep it slightly shorter since the pattern is now established.

### Scene 7: The Dashboard (5-6 seconds, ~165 frames)
**Content:** The TalentWharf dashboard showing both captured candidates now in the system.

**Build a 1920x1080 desktop version of the dashboard:**
- **Sidebar navigation:** Wharf wordmark logo, Home, Candidates, Import — dark sidebar (#171717)
- **Main content area:**
  - Welcome header: "Good to see you, Henrique"
  - KPI cards row (use existing data patterns):
    - Total Candidates: 47 (count-up animation)
    - Added This Week: 6
    - Interviewing: 3
    - Hired: 1
  - **Recent Candidates section** below KPIs — a list/table showing:
    - Alex Torres — Senior Full Stack Engineer — LinkedIn — "new" status badge — Added just now
    - Priya Sharma — Product Designer — Gmail — "new" status badge — Added just now
    - (3-4 more existing candidates below them for context)

**Animation:** Dashboard fades/slides in. KPI numbers count up. The two new candidates (Alex and Priya) are highlighted or have a subtle glow/pulse to draw attention — these are the people you just saved.

### Scene 8: AI Matching (6-8 seconds, ~210 frames)
**Content:** Show AI matching in action — a role opens and the saved people are matched.

**Layout:** Desktop dashboard view, AI Matching section.
- **Text overlay or heading:** "3 months later, a role opens..."
- **AI Match panel:**
  - Textarea with typing animation: "Senior Full Stack Engineer — React, Node.js, 5+ years, startup experience..."
  - "Find Best Matches" button gets clicked
  - Brief loading/analysis animation (scanning bar like existing AIMatchVideo.tsx)
  - **Results appear:**
    1. **Alex Torres** — 96/100 match — "Strong React/Node.js background. Previously expressed interest in joining the team." ← This line is the emotional payoff. The AI found the person who messaged months ago.
    2. Sarah Chen — 89/100 match
    3. Jordan Lee — 82/100 match

**Animation:** Typing animation in textarea (character by character). Button state change. Scanning animation. Results cascade in with stagger. Alex Torres' result should have a slight emphasis (maybe a subtle gold/green border or a "Previously reached out" tag).

### Scene 9: The Payoff — Outreach (4-5 seconds, ~135 frames)
**Content:** Quick scene showing the email composer sending a message back to Alex.
- Email composer modal (use existing pattern from EmailComposerVideo.tsx, adapted for desktop)
- Recipient: Alex Torres
- Subject typing: "Let's chat — that role you asked about is here"
- Quick preview of the email body
- Send button highlights/pulses
- **Optional text overlay:** `"From cold DM to warm intro. Full circle."`

### Scene 10: The Tagline (4-5 seconds, ~135 frames)
**Content:** Clean, bold typography on dark background.
**Text (staggered fade-in):**
1. `"Organize cold messages."` — appears first
2. `"Remember great people."` — appears second
3. `"Hire believers, not strangers."` — appears third, slightly larger or different color accent

**Animation:** Spring fade-in with translateY, staggered 10-12 frames apart. Hold for 2 seconds.

### Scene 11: Outro / CTA (4-5 seconds, ~135 frames)
**Content:** TalentWharf branding + call to action.
- TalentWharf wordmark (use existing WharfWordmark SVG) — spring scale animation from 0.8 to 1.0
- Below the logo: `"Request early access"` — smaller text, fades in after logo
- Below that: `"talentwharf.com"` — fades in last
- Optional: TWLogo mark (the existing circular logo from FullDemoVideo.tsx outro)

**Animation:** Logo springs in. Text elements fade in with stagger. Clean, confident ending.

## Implementation Notes

1. **File structure:** Create a new file `src/BeliefDemoVideo.tsx` for the main composition, and new scene component files as needed (e.g., `src/scenes/LinkedInDMs.tsx`, `src/scenes/GmailInbox.tsx`, `src/scenes/LinkedInProfile.tsx`, `src/scenes/DesktopDashboard.tsx`, etc.)

2. **Reuse existing components:** Use `WharfWordmark`, `TWLogo`, `AppHeader`, `StatusBadge`, `SourceBadge`, `COLORS`, and animation patterns from `src/screens/shared.tsx`. Don't duplicate — import and extend.

3. **Register the composition** in `src/Root.tsx`:
```tsx
<Composition
  id="BeliefDemo"
  component={BeliefDemoVideo}
  durationInFrames={1500}
  fps={30}
  width={1920}
  height={1080}
/>
```
Adjust `durationInFrames` based on actual scene durations.

4. **LinkedIn realism is critical.** The LinkedIn scenes are the emotional core of the video. They need to look like the real LinkedIn UI — correct colors (#0A66C2 for LinkedIn blue), proper layout proportions, realistic typography, avatar circles with initials, proper spacing. Study LinkedIn's actual messaging and profile pages. Use the correct light theme (not dark) for LinkedIn and Gmail — these are real apps the viewer recognizes.

5. **Gmail realism matters too.** Use Gmail's actual color scheme and layout patterns. Light background, red compose button, the distinct email row styling.

6. **Continuity is everything.** Alex Torres appears in Scene 2 (lost DM), Scene 5 (captured on LinkedIn), Scene 7 (in the dashboard), Scene 8 (AI match result), and Scene 9 (outreach email). Priya Sharma appears in Scene 3 (lost email), Scene 6 (captured from Gmail), and Scene 7 (in dashboard). Same names, same details throughout. This is what makes the story work.

7. **The dark/light contrast matters.** Scenes 1, 4, 10, 11 use the dark Wharf theme (COLORS.black background). Scenes 2, 3, 5, 6 use light backgrounds (LinkedIn/Gmail's real colors). Scenes 7, 8, 9 use the Wharf dark dashboard theme. This creates visual rhythm — dark (belief) → light (problem) → dark (transition) → light (solution) → dark (product) → dark (outro).

8. **Typography scale for 1920x1080:**
   - Hero text (Scenes 1, 4, 10): 42-56px, bold/black weight
   - Section headers: 28-32px, semi-bold
   - Body text: 16-18px, regular
   - Small text (timestamps, labels): 12-14px
   - LinkedIn/Gmail UI text should match their real font sizes proportionally

9. **Render command:**
```bash
npx remotion render BeliefDemo out/belief-demo.mp4
```

## What Success Looks Like

When someone watches this video, they should:
1. **Feel the problem** in the first 15 seconds — "oh no, I've definitely lost track of people like that"
2. **Get the concept** by Scene 5 — "oh, it captures people from LinkedIn/email before you forget them"
3. **Feel the payoff** at Scene 8 — "the AI found the same person who messaged months ago — that's powerful"
4. **Remember the tagline** — "Organize cold messages. Remember great people."
5. **Want to sign up** — clear CTA at the end

The video should feel like a story, not a feature tour. Every scene builds on the last. The emotional thread (Alex's lost DM → Alex getting saved → Alex being matched → Alex getting contacted) is what makes this memorable.
