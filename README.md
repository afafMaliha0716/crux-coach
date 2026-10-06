# Crux

Crux gives every member of a climbing gym personal coaching, built from the routes on the gym's wall right now and fitted to the climber's body. The climber uses it, the gym pays for it, and the gym's coaches use it to see who needs them.

This repo is a working demo of the whole product. It runs entirely in the browser, with no account and no server, so it can be shown in class from a laptop or a link.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```
npm install
npm run dev
```

Open the address it prints (usually http://localhost:5173). Use Chrome.

Other commands:

| Command | What it does |
|---|---|
| `npm test` | Runs the unit tests for the session, analysis, flag and insight rules |
| `npm run build` | Type-checks and builds the site into `dist/` |
| `npm run preview` | Serves the built site locally |

## Put it online

The repo includes a GitHub Actions workflow that tests, builds and publishes the site to GitHub Pages on every push to `main`. Turn it on once:

1. On GitHub, open this repo's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the workflow from the **Actions** tab).

The site appears at `https://<your-username>.github.io/crux-coach/`.

## A two-minute demo

The **Viewing as** menu at the top right switches between the four roles. **Reset demo** at the bottom of every page puts everything back to the start.

1. **Onboarding.** Enter 5'0", V3, and pick "Steep body tension" and "Dynamic moves". (Or use "Skip with an example profile".)
2. **Today.** Crux picks Mint V1, Purple V3 and Blue V4 from the 14 routes on the wall, and warns that Blue V4's longest move is 58 in against a 60 in arm span.
3. **Attempt → "Sample: fall at the crux".** Crux tracks the body through the climb and measures a 177° elbow at the furthest reach with both feet low. It flags "Reached at full extension" and shows the setter's beta for climbers of that height. Scrub the clip or jump to the flagged moment.
4. **See my updated session.** Two easier high-foot climbs (Green V2, Orange V3) have replaced the first two.
5. **Attempt → "Sample: with the new beta".** High foot first, bent arm, nothing flagged.
6. **Attempt → "Sample: fall at the crux"** once more, then switch to **Coach**. You are under "Needs attention" with the reason. Send the note.
7. Switch back to **Climber**. The coach's note is on Today.
8. **Setter → Blue V4.** The route shows as harder for shorter members, from the example send data. Retire it, and the climber's session rebuilds without it.
9. **Gym admin → Revenue.** What the gym collects, what it pays Crux and what it keeps, with both prices adjustable.

## Analyzing a real video

Use **Upload or record a video** on the Attempt screen. On a phone the button opens the camera.

- Film from behind, with the whole body in frame for the whole climb.
- Crux analyzes the first 45 seconds. Analysis takes about as long as the clip, and the first upload adds a few seconds while the pose model loads.
- Use Chrome. MP4 works everywhere. iPhone clips work if the phone is set to Settings → Camera → Formats → Most Compatible.
- The video is analyzed on the device and is not uploaded.

How it handles real footage:

- It steps through the clip at 10 frames a second instead of playing it, so a slow laptop measures the same moments as a fast one. On a slow device it samples less often (never under 3 a second) to finish in about a minute.
- It ignores frames where the climber is standing on the mat, so reaching up to the start holds does not count as a reach. The mat level is taken from the lowest the feet get during the clip.
- The results show how many frames the climber was tracked in, and warn when tracking was lost in more than 40% of them.

**Showing a real clip quickly.** Once a clip has been analyzed, Crux saves the video and its measurements in that browser. Next time, it appears under "Clips analyzed on this device" on the Attempt screen and opens instantly. Uploading the same file again is instant too. So for a live demo: analyze the clip once beforehand, on the laptop and browser you will present from, at the address you will present from. Reset demo does not remove saved clips.

It has been run on two real bouldering clips filmed from behind on a phone, with the climber small in frame. The pose was found in 86% and 93% of frames.

**Known limit.** The full-extension rule fires whenever a hand is high overhead on a straight arm. On real footage that includes ordinary straight-arm hangs, which are often good technique. The rule needs tuning against real climbs before its feedback can be trusted. The threshold constants are at the top of `src/lib/analysis.ts`.

## What is real and what is example data

**Computed live:**

- The session (which three routes, and why), from the climber's profile and attempt history.
- The long-reach warning, from the route's longest move and the climber's arm span.
- The movement measurements, from pose tracking that runs in the browser on each video frame.
- The coach flags, from the attempt log.
- The setter's height comparison and the revenue figures, from the data in the app.

**Example data, labelled "example" in the interface:**

- The gym, its 14 routes and the two pieces of written beta for Blue V4.
- The six other climbers and their attempt histories.
- The three staff members.
- The two sample attempts, which are animations. They produce the same landmark data as a real video and run through the same measurement code, and they are left out of route statistics.

Video is analyzed on the device and is never uploaded. "Share this clip with my coach" makes the clip visible on the Coach screens during the same visit only, because the demo has no server to store it on.

## How it works

The rules live in `src/lib/` as plain TypeScript with no framework code, so they can be tested and reused.

| File | Rule |
|---|---|
| `reach.ts` | Arm span is height plus ape index. A route is a long reach when its longest move is more than 93% of the span. |
| `session.ts` | Scores each live route by its tags: +2 for a focus area the climber chose, +3 for each attempt with a linked finding. Picks a warm-up (one or two grades down), a technique climb (at grade) and a project (one grade up). |
| `analysis.ts` | From pose landmarks, finds the furthest reach and measures the elbow angle there, the reach height in torso lengths, whether a knee rose above the hip in the 3 seconds before, and the share of overhead time on bent arms. Flags full extension at 160° or more. |
| `flags.ts` | Flags a climber for the coach after the same finding on 2 attempts, 3 falls on one route in 7 days, or 21 days without a send. Marking reviewed clears the flag. |
| `insight.ts` | Compares send rates for climbers under 5'4" with everyone else once each group has 5 attempts, and flags a gap of 25 points or more. |
| `samples.ts` | Builds the two sample attempts from keyframes. |
| `seed.ts` | The example gym, routes, climbers and attempts. |

Every threshold is a named constant at the top of its file. The tests in `src/lib/*.test.ts` cover the acceptance checks in the spec.

The rest of `src/`:

| Path | What it holds |
|---|---|
| `store.tsx` | All app data and the actions that change it, saved to the browser's localStorage |
| `pose.ts` | Loads MediaPipe Pose and runs it on video frames |
| `savedClips.ts` | Keeps analyzed clips in the browser so they reopen instantly |
| `screens/` | One file per role: `climber.tsx`, `coach.tsx`, `setter.tsx`, `admin.tsx` |
| `components/` | Shared pieces, including `Playback.tsx` (the clip with its skeleton and scrubber) |
| `styles.css` | Design tokens and component styles, light and dark |

## Where this differs from the spec

`docs/CRUX_SPEC.md` describes the full product. This demo makes four deliberate changes so it runs anywhere with no setup:

| Spec | This demo | Why |
|---|---|---|
| Supabase accounts and database | Data in the browser, with a role switcher instead of sign-in | A class demo should not depend on a network service or a login |
| Next.js | Vite and React | A static site that GitHub Pages can host |
| Tailwind | One CSS file using the spec's tokens | Fewer moving parts for the same design |
| `@mediapipe/tasks-vision` | `@mediapipe/pose` | Its model files ship inside the npm package, so tracking works offline. The 33 landmarks are the same. |

To turn the demo into the product, replace `src/store.tsx` with a client for a real backend and add sign-in. The rules in `src/lib/` and the screens do not need to change.

## Not built yet

- Accounts, and data shared between devices. Each browser has its own copy.
- Storing shared clips.
- More movement rules. Today there are two: full-extension reaches and time locked off on bent arms.
- Payments.
