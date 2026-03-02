# TalentWharf — Validation & Measurement System

*Created: 2026-02-25*
*Budget: $0 — Supabase + PostHog free tier + Google Sheets*

---

## The Three Questions You're Trying to Answer

1. **Problem validation** — Is losing track of inbound candidates painful enough to change behavior?
2. **Solution validation** — Does TalentWharf actually fix it, or are people using it out of politeness?
3. **Market validation** — Is the ICP (seed–Series B startups actively hiring) right, or do we need to narrow?

---

## North Star Metric

**Candidates captured per active team per week**

Why: This is the core value action. If a team is regularly capturing, they believe the problem is real AND the product is solving it. Everything else is either a leading indicator (toward this) or lagging (confirming it creates outcomes).

---

## Validation Framework — 4 Checkpoints

### Checkpoint 1: Activation (Week 1 per team)
**Question:** Does a new team actually use the product after signing up?

| Signal | Target | Below this = |
|--------|--------|-------------|
| Teams capturing 1+ candidate within 48h of signup | 70%+ | Onboarding friction |
| Teams capturing 5+ candidates in Week 1 | 50%+ | Weak activation — fix before Batch 2 |

**How to gather:** Check Supabase. If below target, do calls with the non-activating teams *this week*.

---

### Checkpoint 2: Aha Moment (Week 1–2)
**Question:** Does a user find a candidate they'd genuinely forgotten about?

This is the entire value proposition. If it doesn't happen, everything else is noise.

**How to track:** 3-day follow-up DM/email: *"Have you found anyone in your inbox you'd forgotten about?"*

| Signal | Target | Below this = |
|--------|--------|-------------|
| Teams who had the aha moment | 40%+ in Batch 1 | Product or ICP problem |
| Teams who say "not really — I don't get many inbound DMs" | <20% | Wrong ICP tier (too early-stage, no inbound yet) |

**If aha moment rate is low:** Talk to 5 non-aha users. Most likely root causes:
- Company is too early to receive inbound (pre-product-market fit themselves) → shift to growth-stage ICP
- Extension isn't surfacing the right conversations → product fix
- Users think they'll remember people and don't bother capturing → messaging/habit fix

---

### Checkpoint 3: Retention (Week 2–4)
**Question:** Do teams return on their own, without you prompting them?

| Signal | Target | Below this = |
|--------|--------|-------------|
| Batch 1 teams active (1+ candidate captured or reviewed) in Week 2 | 60%+ | Onboarding didn't create habit |
| Batch 1 teams active in Week 4 | 40%+ | Problem may be too infrequent |

**Retention risk for TalentWharf:** The use case is naturally episodic — you might not be actively hiring every week. Watch for this pattern: high Week 1 activation, low Week 4 retention. If that's what you see, it's not a product failure — it's a trigger problem. Solution: add a role-open notification flow or a weekly "people who reached out this week" digest.

---

### Checkpoint 4: PMF Survey (Week 6–8)
Send to any user who's captured 5+ candidates.

**The Sean Ellis question:** *"How would you feel if you could no longer use TalentWharf?"*
- Very disappointed
- Somewhat disappointed
- Not disappointed (it's not that useful)

| Result | Response |
|--------|----------|
| 40%+ "very disappointed" | Strong PMF signal. Press the gas on acquisition. |
| 25–39% | Promising. Do deep interviews with the "very disappointed" users. Find exactly what they value and double down on it. |
| <25% | PMF problem. Problem not painful enough, or solution misses. Don't scale yet. |

**Follow-up question for every "very disappointed" user:**
*"What would you use instead if TalentWharf didn't exist?"*
Their answer tells you your real competition and your real value.

---

## Pivot Triggers

These are the signals that tell you something fundamental needs to change:

| Signal | Threshold | Likely Cause | Response |
|--------|-----------|--------------|----------|
| Activation rate (5+ candidates Week 1) | <30% | Onboarding friction or wrong ICP | 5 user calls this week |
| Aha moment rate | <25% | Product not delivering core value | Talk to all non-aha users |
| Week 4 retention | <25% | Problem too infrequent or product too shallow | Add role-open trigger flows |
| PMF score | <25% "very disappointed" | Problem not painful enough OR solution misses | ICP pivot or positioning pivot |
| Common feedback: "I don't get inbound DMs" | >40% of beta users | ICP is too early-stage (no inbound yet) | Shift to growth-stage companies (Series A+) |
| Common feedback: "I just use it when I'm hiring" | >60% of users | Use case is episodic, not habitual | Build a role-open trigger flow as core feature |

---

## Measurement System

### Tool Stack ($0 budget)

| Tool | What It Measures | Why |
|------|-----------------|-----|
| Supabase (you have it) | Product metrics — candidates, teams, activity | Free, already your DB |
| PostHog | Event tracking, funnels, retention cohorts | Free up to 1M events/mo |
| Google Sheets | Weekly dashboard, manual growth metrics | Free, flexible |
| LinkedIn Creator Analytics | Impressions, reach, follower growth | Free, built-in |
| Loops.so or Brevo | Email open/click rates | Free tier |

---

### PostHog Setup — Events to Track

Add PostHog to the dashboard. These events are the minimum viable instrumentation:

**Core product events:**
```
candidate_captured        { source: "linkedin|gmail|manual", team_id }
candidate_viewed          { team_id }
candidate_stage_changed   { from_stage, to_stage, team_id }
ai_match_run              { job_id, results_count, team_id }
email_sent_to_candidate   { template_used, team_id }
extension_opened          { source_site: "linkedin|gmail", team_id }
```

**Funnel milestone events:**
```
signup_completed
extension_installed
first_candidate_captured   ← activation milestone 1
fifth_candidate_captured   ← activation milestone 2 (deep activation)
first_ai_match_run         ← feature adoption milestone
```

**PostHog dashboards to build:**
1. **Activation funnel** — signup → extension installed → first capture → 5 captures
2. **Retention cohorts** — Week 0, 1, 2, 4 retention by signup batch
3. **Daily/weekly active teams**
4. **Feature adoption** — % of teams who've run AI match

---

### Supabase Queries — Pull Weekly

Run these in the Supabase SQL editor every Monday:

```sql
-- Active teams last 7 days
SELECT COUNT(DISTINCT organization_id) AS active_teams_7d
FROM candidates
WHERE created_at > NOW() - INTERVAL '7 days';

-- Total candidates and teams
SELECT
  COUNT(*) AS total_candidates,
  COUNT(DISTINCT organization_id) AS total_teams
FROM candidates;

-- Candidates per team (find power users + laggards)
SELECT organization_id, COUNT(*) AS candidates_captured
FROM candidates
GROUP BY organization_id
ORDER BY candidates_captured DESC;

-- Activation rate (teams with 5+ candidates = "activated")
SELECT
  COUNT(*) FILTER (WHERE cnt >= 5) AS activated_teams,
  COUNT(*) AS total_teams,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cnt >= 5) / NULLIF(COUNT(*), 0), 1) AS activation_rate_pct
FROM (
  SELECT organization_id, COUNT(*) AS cnt
  FROM candidates
  GROUP BY organization_id
) t;

-- Candidates captured by week (growth trend)
SELECT
  DATE_TRUNC('week', created_at) AS week,
  COUNT(*) AS candidates_that_week,
  COUNT(DISTINCT organization_id) AS active_teams
FROM candidates
GROUP BY week
ORDER BY week DESC
LIMIT 12;
```

---

### Google Sheets — Weekly Scorecard

**Tab 1: Weekly Numbers**

| Metric | Wk 1–2 Target | Wk 3–6 Target | Wk 7–12 Target | This Week | vs. Target |
|--------|--------------|---------------|----------------|-----------|------------|
| Waitlist signups (total) | 50 | 100 | 200 | | |
| Beta invites sent | 10 | 30 | 50 | | |
| Beta teams onboarded | 5 | 25 | 50 | | |
| Active teams (7-day) | 3 | 15 | 35 | | |
| Candidates captured (total) | 20 | 150 | 500 | | |
| Candidates captured (this week) | 10 | 30 | 60 | | |
| AI matches run (total) | 0 | 15 | 50 | | |
| Aha moments collected | 0 | 5 | 15 | | |
| PMF survey "very disappointed" | — | — | 40%+ | | |
| Activation rate (5+ candidates) | — | 50% | 60% | | |
| Week 4 retention | — | — | 40%+ | | |

**Tab 2: LinkedIn Scorecard**

| Metric | Weekly Target | This Week | Best Post This Week | Notes |
|--------|--------------|-----------|---------------------|-------|
| Posts published | 2–3 | | | |
| Total impressions | 5K+ | | | |
| Profile views | 150 | | | |
| New followers | 30 | | | |
| Comments received | 40 | | | |
| DMs about TalentWharf | 5 | | | |
| Waitlist signups attributed to LinkedIn | 10 | | | |

**Tab 3: Beta Team Tracker**

One row per team. Columns:
- Company name | ICP tier (seed/series-a/series-b) | Team size
- Invite date | First candidate captured date | Total candidates (update weekly)
- Aha moment? (Y/N) | Aha moment story (1 sentence)
- Last active date | PMF survey response
- Referrals sent | Notes

**Tab 4: Conversion Funnel**

Track weekly:
```
LinkedIn impressions
  → Profile visits                (impressions to profile %)
  → Waitlist signups              (visit to signup %)
  → Beta invites sent             (invite rate — you control this)
  → Account created               (invite to signup %)
  → Extension installed           (signup to install %)
  → First candidate captured      (Day 1 activation %)
  → 5+ candidates captured        (Deep activation %)
  → Aha moment                    (Value delivery %)
  → Active at Week 4              (Retention %)
```

---

### Weekly Review Ritual

**Monday (30 min) — Pull & Record:**
1. Run Supabase queries → update Tab 1
2. Check PostHog activation funnel + retention cohort
3. Check LinkedIn Creator Analytics → update Tab 2
4. Update Beta Team Tracker with any new captures or aha moments
5. Note one anomaly: *"This week, [X] surprised me because..."*

**Friday (30 min) — Decide:**
1. Review scorecard vs. targets
2. Which metric is most behind? → That's your priority next week
3. What's the best beta story you heard? → That's your LinkedIn post Monday
4. What one thing would most improve the North Star metric this week?

---

## 12-Week Decision Framework

At Week 12, your metrics point to one of three calls:

### Press the Gas
**Signals:** 50 active teams, 40%+ PMF score, 5+ aha stories, Week 4 retention >40%
→ Open Product Hunt, start self-serve signups, consider paid tier announcement

### Iterate
**Signals:** 25–45 teams, OK retention, PMF score 25–35%, activation but few aha moments
→ Narrow ICP (larger companies = more inbound), deepen the matching experience, go high-touch with your best 10 teams

### Pivot
**Signals:** <20 active teams at Week 12, low retention, "I don't get inbound" is common feedback
→ The inbound-capture angle may be the wrong entry point. Consider: is TalentWharf actually an outbound sourcing tool with a better UX? That's a real market. Or: focus entirely on teams that are Series A+ where inbound volume is guaranteed.

---

## PMF Validation Checklist

Run this at Week 8:

- [ ] 40%+ PMF score ("very disappointed") from users with 5+ candidates
- [ ] Can describe the "very disappointed" user with specificity (role, company stage, use case)
- [ ] Have 5+ "aha moment" stories you could tell on stage
- [ ] At least 3 teams actively recommended to another founder unprompted
- [ ] North Star metric growing week-over-week for 4+ consecutive weeks
- [ ] You understand *why* people churn (not just that they do)

If all 6 are checked: you have PMF. Build for scale.
If 3–5 are checked: you have a hypothesis worth refining. Stay in beta, go deeper.
If <3 are checked: talk to users before building anything new.
