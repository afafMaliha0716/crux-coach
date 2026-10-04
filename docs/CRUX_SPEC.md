# Crux: product and build spec

This file is the brief for building Crux as a real, working repo. Read all of it before writing code. A working single-file prototype is included as `crux-demo-reference.html`; its logic is correct and tested, so port it rather than reinventing it.

---

## 1. What Crux is

Crux gives every member of a climbing gym personal coaching, built from the routes on the gym's wall right now and fitted to the climber's body.

- **User:** the climber (a gym member).
- **Customer:** the gym. It sells Crux to members as a paid add-on (working price: $15 per member per month) and pays Crux a share (working price: $5 per active member per month).
- **Third role:** the gym's coaches, who use Crux to see which climbers need them.

**The problem.** Most gym members want to improve and almost none get coached, because a private lesson costs roughly $60 to $99 an hour and one coach can only be in one place. Generic training apps build strength but have never seen the gym's wall. Gym software knows every route but does not coach movement. And beta from taller climbers often does not work for shorter ones.

**The core loop.** Build everything in service of this loop:

1. Setters tag each route when they set it.
2. Crux builds each climber a session from the routes currently on the wall.
3. The climber films an attempt. Crux measures their movement and gives feedback that fits their body.
4. The next session adapts to what Crux measured.
5. Repeated problems are flagged to a coach, who steps in with a note or a lesson.
6. When the gym resets the wall, every plan resets with it.

**Founder's story (keep the product true to it).** The founder is five feet tall, got into climbing over a summer, plateaued when she lost her friends' informal coaching, and found that "just reach for it" is not advice when you cannot reach it. Short climbers are the first audience. Every feature should work well for someone 5'0".

---

## 2. Principles

1. **Measured, not guessed.** Feedback comes from numbers taken from the video (angles, heights, timing) and fixed rules. Every piece of feedback must point to a number and a moment in the attempt. Do not generate coaching advice with an LLM in v1.
2. **Honest about data.** Anything that is seed or example data is labelled as such in the UI. Never present invented climbers, sends or statistics as real.
3. **The coach is in the loop.** Crux gives coaches leverage. It never tells a climber they do not need a coach.
4. **The wall is the curriculum.** Recommendations always name a real route on the wall today, never a generic drill.
5. **Private by default.** Pose analysis runs on the climber's device. A video only leaves the device if the climber chooses to share it with their coach.

---

## 3. Roles and permissions

| Role | Can do |
|---|---|
| Climber | Edit own profile, view own session, upload and analyze attempts, see own history and coach notes, choose to share a clip with a coach |
| Coach | See the roster for their gym, see flags and attempt summaries, view clips climbers shared, send notes, mark climbers reviewed |
| Setter | Add, edit, tag and retire routes; see per-route insight |
| Gym admin | Everything above, plus manage staff accounts and see the membership and revenue summary |

One account belongs to one gym. A person can hold more than one role.

---

## 4. Tech stack

Use this unless there is a strong reason not to. If you change something, say why in the README.

- **Framework:** Next.js (App Router) with TypeScript, strict mode.
- **Styling:** Tailwind CSS with the design tokens in section 9 defined as CSS variables. No component library with its own look; build the small set of components in section 9.
- **Data and auth:** Supabase (Postgres, Auth, Storage, row-level security). Email magic-link sign-in.
- **Pose tracking:** MediaPipe Pose Landmarker (`@mediapipe/tasks-vision`), running in the browser. The prototype uses the older `@mediapipe/pose` package; the 33 landmark indices are the same.
- **Tests:** Vitest for the pure logic in section 6 (session builder, analysis, flagging). These functions must have unit tests, using the prototype's sample attempts as fixtures.
- **Payments:** not in v1. The revenue view uses the membership table and the working prices; do not integrate Stripe yet.

Structure the logic as pure, framework-free TypeScript modules in `lib/` (`session.ts`, `analysis.ts`, `flags.ts`, `reach.ts`) so they can be tested and later reused in a mobile app.

---

## 5. Data model

```
gyms            id, name, created_at
profiles        id (auth user), gym_id, display_name, roles[], height_in, ape_in,
                grade (int, V-scale), focus_areas[], crux_member (bool), created_at
routes          id, gym_id, color_name, color_hex, grade, wall, tags[],
                longest_move_in, status ('live' | 'retired'), set_at, retired_at, setter_id
route_beta      id, route_id, height_min_in, height_max_in, text, source ('setter' | 'coach' | 'derived'),
                author_id
attempts        id, climber_id, route_id, created_at, source ('video' | 'sample'),
                outcome ('sent' | 'fell'), metrics (jsonb), findings[], frames_analyzed,
                clip_path (nullable; set only if shared), shared_with_coach (bool)
coach_notes     id, climber_id, coach_id, body, created_at, read_at
reviews         id, climber_id, coach_id, created_at    -- "marked reviewed"
```

- `grade` is an integer on the V scale (V0 = 0).
- `longest_move_in` is the hand-to-hand distance of the route's longest move, in inches, entered by the setter.
- `tags` come from a fixed vocabulary: `balance`, `high foot`, `lock-off`, `dynamic`, `body tension`, `heel hook`, `toe hook`, `compression`, `crimps`, `slopers`, `mantle`.
- Row-level security: climbers read and write only their own rows; coaches and setters read rows for their gym; `clip_path` is readable by a coach only when `shared_with_coach` is true.

**Seed data.** Ship a seed script that creates one demo gym ("Summit Bouldering"), the 14 routes from the prototype's `ROUTES` array, the route beta for Blue V4, and six example climbers. Mark seeded climbers with a flag so the UI can label them "example".

---

## 6. Logic (port from the prototype; these rules are tested)

### 6.1 Arm span and reach

- `span_in = height_in + ape_in`
- A route is a **long reach** for a climber when `longest_move_in > 0.93 * span_in`.
- When a route is a long reach, show: "Longest move is X in. Your span is Y in." and prefer beta written for the climber's height band.

### 6.2 Session builder

A session is three live routes: **Warm-up**, **Technique**, **Project**.

1. Build tag weights:
   - +2 for each tag belonging to a focus area the climber selected.
   - +3 for each tag linked to a finding, once per logged attempt with that finding. Measured behavior outweighs self-report.
2. Score each live route as the sum of the weights of its tags. Break ties by set order.
3. Pick, without repeating a route:
   - **Warm-up:** best score among grades `g-2` to `g-1`; subtract 2 if it is a long reach. Fall back to `g-3`, then `g`.
   - **Technique:** best score at grade `g`. Fall back to `g-1`.
   - **Project:** best score at grade `g+1`. Fall back to `g`, then `g-1`.
4. Each card shows a one-line reason built from the matched tags, for example "Trains high foot at a grade you can repeat."
5. When a session changes because of a new attempt, mark the new routes "Added after your last attempt".

Focus areas and their tags: Steep body tension → `body tension`; Dynamic moves → `dynamic`; High feet → `high foot`; Slab balance → `balance`; Lock-offs → `lock-off`; Heel and toe hooks → `heel hook`, `toe hook`; Compression → `compression`.

A session must also rebuild when a route in it is retired (the wall was reset).

### 6.3 Attempt analysis

Input: an array of frames, each with a timestamp and 33 pose landmarks (normalized x, y, visibility), plus the video's pixel width and height. Convert to pixels before measuring angles.

Landmarks used: shoulders 11/12, elbows 13/14, wrists 15/16, hips 23/24, knees 25/26, ankles 27/28. Ignore a landmark with visibility under 0.5.

Per frame:
- `torso` = distance from the midpoint of the shoulders to the midpoint of the hips.
- For each arm: `reach = (shoulder.y - wrist.y) / torso` and `elbow_angle` = the angle at the elbow in degrees.
- `high_foot` = either knee is above its hip by more than `0.05 * torso`.

Across the attempt:
- **Peak reach** = the frame and arm with the highest `reach`. Record its time and elbow angle.
- **High foot before the reach** = `high_foot` was true in any frame within 3 seconds before the peak.
- **Bent-arm share** = of the frames where a hand is overhead (`reach > 0.3`), the share where the smallest elbow angle is under 95°.

Findings:
- `reach` ("Reached at full extension"): peak elbow angle ≥ 160° and peak reach ≥ 0.9. Linked tags: `high foot`, `lock-off`.
- `bent` ("Hanging on bent arms"): bent-arm share > 0.65. Linked tag: `balance`.
- No findings: "Clean movement".

Reject the clip with a clear message if fewer than 30% of frames have a usable pose, or fewer than 5 frames do: "Crux could not find a climber in this clip. Film from behind with your whole body in frame."

Limits for v1: one climber in frame, filmed from behind, clips up to 45 seconds.

**Add next, in this order, each as its own tested rule:** feet cutting loose on steep terrain; hips far from the wall; pausing too long before the crux; left/right imbalance in which arm reaches.

### 6.4 Feedback shown to the climber

For each finding, show the measurement, the timestamp and one plain sentence. Example: "At 4.0s your arm was straight (177°) with both feet still low. There was no height left to gain."

Then show **beta for your body**: the `route_beta` row whose height band contains the climber's height. If none exists, show the generic suggestion for that finding and say no body-specific beta exists yet for this route. Never invent a claim such as "climbers your height send it this way" unless it comes from real logged sends.

Let the climber scrub the clip with the skeleton overlay, and jump to the flagged moment with one tap.

### 6.5 Coach flags

A climber is flagged when any of these is true and the coach has not marked them reviewed since:
- the same finding appears on 2 or more attempts;
- 3 or more falls on the same route in 7 days;
- no new send in 21 days while still attending.

Each flag shows the reason in one sentence with the numbers behind it.

### 6.6 Setter insight

For each live route, show send rate split by height band once there are at least 5 attempts per band. Flag a route that "climbs harder for shorter members" when the send rate for climbers under 5'4" is at least 25 points lower than for the rest.

---

## 7. Screens

### Climber

1. **Onboarding.** Three short steps: body (height, ape index with a "how to measure" hint), grade, focus areas. One question per screen. Finish on the first session.
2. **Today.** The home screen. Three route cards (Warm-up, Technique, Project): color dot, name and grade, wall, tags with matched tags highlighted, the one-line reason, and the long-reach line when it applies. A coach note, if unread, sits above the cards. One primary action: "Log an attempt".
3. **Attempt.** Pick the route (defaults to the Project), upload or record a clip, choose "sent" or "fell". Playback fills the screen with the skeleton overlay. When analysis finishes, show four metrics (elbow angle at furthest reach, reach height in torso lengths, high foot before the reach, time locked off on bent arms), then the findings, then the beta. Offer "Share this clip with my coach" as an explicit choice.
4. **History.** A list of attempts with route, date, outcome and pattern. A "What Crux has learned about you" summary at the top lists repeated patterns in plain words.
5. **Profile.** Edit body, grade and focus areas. Changing any of them rebuilds the session immediately.

Keep the prototype's two sample attempts available behind a "Try a sample" link on the Attempt screen, for demos and for users who have no clip yet. They must run through the same analysis function as real video.

### Coach

1. **Today.** Summary line ("3 need attention, 41 on track"), then the **Needs attention** list. Each row: name, height, grade, the flag reason, buttons for "Send note" and "Mark reviewed". Opening a row shows the climber's recent attempts, measured patterns and any shared clips.
2. **Roster.** Everyone else, with a one-line trend over the last four weeks.
3. **Note composer.** Short free text. Sent notes appear on the climber's Today screen.

### Setter

1. **Wall.** The list of live routes, grouped by wall. Add a route in under 30 seconds: color, grade, wall, tags from the fixed list, longest move in inches.
2. **Route detail.** Edit tags, add beta per height band, retire the route. Shows the setter insight from 6.6.
3. **Reset.** Retire every route on one wall in one action.

### Gym admin

1. **Members.** Who has Crux, with a count of active members this month.
2. **Revenue.** Active members × $15 collected, × $5 owed to Crux, the remainder kept by the gym. Label the prices as configurable assumptions.
3. **Staff.** Invite coaches and setters.

---

## 8. Milestones

Build in this order. Each milestone must run and be demoable before starting the next.

1. **Logic and tests.** Port `lib/` from the prototype with unit tests. No UI.
2. **Climber app, local only.** Onboarding, Today, Attempt (with real pose tracking and the samples), History. State in the browser. Seed routes loaded from a JSON file.
3. **Accounts and data.** Supabase schema, auth, row-level security, seed script. Climber data persists.
4. **Coach.** Flags, roster, notes, shared clips.
5. **Setter.** Route tagging, beta per height band, reset, insight.
6. **Gym admin.** Members and revenue.

---

## 9. Design direction

The interface should feel calm, precise and a little warm: a training tool a climber trusts, with nothing decorative competing with the wall, the route and the number.

### What to learn from, and what specifically to take

Take the principles named here. Do not copy any app's screens, layouts, icons, logos or branding.

| Reference | What people praise | What Crux takes from it |
|---|---|---|
| **Linear** | Ultra-minimal, precise, one accent color, consistent alignment, low clutter, fast | One accent used sparingly; hairline borders instead of shadows; a tight type scale; every screen aligned to one left edge; instant transitions |
| **Gentler Streak** (Apple Design Award winner) | Calm palette, big bold numbers, gentle animation, an encouraging tone that never scolds | Measurements shown as large numerals with a small plain label; feedback worded as an observation and a next step, never as failure |
| **Things 3** | Generous white space, one clear action per screen, quiet motion | One primary button per screen; lists with air between rows; nothing boxed unless it needs to be |
| **Oura and Whoop** | One hero number per screen, detail one tap below | Today leads with the session; an attempt leads with one headline finding; everything else is a level down |
| **Tide Guide** (Apple Design Award 2026, Visuals and Graphics) | Full-screen charts with custom animation | Attempt playback is full-bleed and is the one place with expressive motion: the skeleton draws on, and the flagged joint highlights at the flagged moment |

### Rules

- **Color carries meaning, never decoration.** The interface is near-monochrome. The only saturated colors on screen are the route's hold color (as a small dot or swatch) and the single accent. Status colors (flagged, clean) appear only on status.
- **One accent.** Use it for the primary button, the flagged joint in playback and the count of climbers who need attention. Nothing else.
- **Type does the hierarchy.** No more than four text sizes per screen. Measurements (angles, inches, seconds, grades) use the mono face with tabular numerals, so numbers read as measured.
- **Borders, not shadows.** Cards are a 1px line on a flat surface. Radius 12px on cards, 8px on inputs, fully round on chips.
- **Density.** Climber screens are spacious and built for one thumb at a gym. Coach and setter screens are denser lists built for a laptop.
- **Motion.** 150 to 200ms ease-out on state changes. The only longer animation is the skeleton in playback. Respect `prefers-reduced-motion`.
- **Words.** Short, specific, plain. Say what was measured. "Your arm was straight at 4.0s" beats "Great effort! Try improving your reach technique."
- **Mobile first** for climber screens (375px wide and up). Coach, setter and admin screens are designed for desktop and must still work on a phone.
- **Both themes.** Light and dark, driven by the tokens below. Climbing gyms are bright, so light is the default.
- **Accessibility.** Body text contrast at least 4.5:1. Visible focus states. Never rely on route color alone; always show the color name beside the dot.

### Tokens

```
/* light */
--bg:        #FAF8F4;   /* chalk */
--surface:   #FFFFFF;
--ink:       #1E2547;   /* headings, numerals */
--body:      #4A4E63;
--muted:     #8A8FA3;
--line:      #E7E3DA;
--accent:    #D2452F;   /* the one accent */
--accent-fg: #FFFFFF;
--ok:        #2F7A56;
--ok-bg:     #E3F1E8;
--flag-bg:   #FBE6E1;

/* dark */
--bg:        #12142A;
--surface:   #1B1E3A;
--ink:       #F4F1EA;
--body:      #C9CBD8;
--muted:     #8C90A8;
--line:      #2C3058;
--accent:    #F07A65;
--accent-fg: #1A1220;
--ok:        #7FD0A4;
--ok-bg:     #1D3F34;
--flag-bg:   #43252C;
```

- **UI typeface:** Geist (weights 400, 500, 600). Fallback: system sans.
- **Measurement typeface:** Geist Mono, tabular numerals.
- **Wordmark only:** Fredoka 600, to match the existing pitch deck. Do not use it anywhere else.
- **Type scale:** 13 / 15 / 18 / 24 / 40 px. The 40px size is for the hero numeral only.
- **Spacing scale:** 4, 8, 12, 16, 24, 32, 48 px.

### Components to build (and no others without a reason)

Button (primary, quiet), Chip (tag, selectable), RouteCard, MetricTile, FindingCard, BetaCard, PlaybackStage with skeleton overlay and scrubber, ListRow, FlagRow, NoteComposer, SegmentedControl, TextField, Select, EmptyState.

The route color dot is an irregular hold-shaped blob, as in the prototype. It is the only illustration in the product.

---

## 10. What is out of scope for v1

- LLM-written coaching or chat.
- Social features, leaderboards, feeds.
- Payments and billing.
- Integrations with existing gym software.
- Native mobile apps. Build a responsive web app that works well on a phone.
- Roped climbing. V1 is bouldering only.

---

## 11. Acceptance checks

The build is not done until all of these pass.

1. A new climber who enters 5'0", ape index 0, V3 and the focus areas "Steep body tension" and "Dynamic moves" gets the session Mint V1, Purple V3, Blue V4 from the seed routes, with the long-reach line on Blue V4 (58 in against a 60 in span).
2. The prototype's sample "fall at the crux" produces the finding `reach` with a peak elbow angle of about 177° and no high foot, and the session changes to Green V2, Orange V3, Blue V4.
3. The prototype's sample "with the new beta" produces no findings.
4. Two attempts with the `reach` finding put that climber on the coach's Needs attention list with the reason stated. Marking reviewed removes them.
5. A coach note appears on the climber's Today screen.
6. Retiring a route that is in a climber's session rebuilds the session without it.
7. A real climbing clip filmed from behind is analyzed on the device, and no video is uploaded unless the climber taps "Share".
8. No screen shows example data without an "example" label.
9. Every screen works at 375px wide with no horizontal scrolling, in both themes.
10. Unit tests cover `session.ts`, `analysis.ts`, `flags.ts` and `reach.ts`.

---

## 12. Open decisions (ask the founder before building these parts)

- The product name in the UI: "Crux" alone, or "Crux" for the platform and "Crux+" for the member add-on.
- Whether climbers can record in the app or only upload from the camera roll.
- Whether coaches can see a climber's attempt metrics by default, or only after the climber opts in.
- Who writes route beta in v1: setters only, or coaches too.
