# Group Challenge 2026

A reusable small-group fitness challenge app for a 30-day month. Participants
choose 3 activities each day, log progress toward 100 points per activity, and
work together toward a shared team goal.

## Features

- 10 activity choices with per-activity point caps
- Daily 3-activity selection
- Automatic rotating double-points activity
- Team daily total, month total, group goal, and pace status
- Private personal progress panel for the current device
- Public participant list and previous-day 400 club
- Anonymous Firebase identity with owner-only writes
- Browser-only test mode
- Installable Progressive Web App

## Scoring

- Push ups: enter actual reps, 2 points each
- Pull ups: enter actual reps, 10 points each
- Squats: enter actual reps, 1 point each
- Sit ups: enter actual reps, 1 point each
- Plank: enter actual seconds, 10 points per 30 seconds
- Walking: enter actual minutes, 10 points per 5 minutes
- Running: enter actual minutes, 10 points per 5 minutes
- Dancing: enter actual minutes, 20 points per 5 minutes
- Stairs: enter actual stairs, 1 point per 5 stairs
- Bird dog: enter actual reps, 2 points each

The app records the actual amount entered, but each activity is capped at 100
base points. For example, 100 push ups still shows as 100 push ups, but awards
100 base points. The rotating double-points activity can make one selected
activity worth 200 points, so the daily max is 400.

Inclusive movement notes:

- Push ups may be wall pushups, knee pushups, or full pushups.
- Sit ups may be full sit ups or crunches.
- One bird dog rep means a right-left pair.

The group goal is:

```text
participants x 30 days x 250 points
```

Challenge days follow US Pacific time (`America/Los_Angeles`) for everyone. That
means today's log, yesterday's 400 club, team daily totals, and double-points
days all use the same shared challenge date even when participants are in
different time zones.

## Run Locally

The app has no build step. Serve the folder with a local web server:

```powershell
py -m http.server 8000
```

Then open:

```text
http://localhost:8000/
```

## Test Mode

Add `?test=1` to the URL:

```text
http://localhost:8000/?test=1
```

Test mode stores participants and progress only in that browser. It does not
read or write Firebase data. The test group starts empty.

## Firebase Setup

1. In Firebase Console, create or open a project.
2. Register a Web app in Project settings.
3. Copy the Web API key into `firebase-config.js`.
4. Copy your Realtime Database URL into `firebase-config.js`.
5. Enable Authentication -> Sign-in method -> Anonymous.
6. Create a Realtime Database.
7. Publish the contents of `database.rules.json` as your Realtime Database
   rules.
8. In Realtime Database -> Data, create `/settings/joinOpen` with Boolean value
   `true`.

Once everyone has joined, set `/settings/joinOpen` to `false`. Existing
participants can keep updating their own entries, but new participant records
will be rejected.

The rules can also be deployed with Firebase CLI:

```powershell
firebase deploy --only database
```

Live participant data is stored under `/groupChallenge/{firebaseUserId}`.

## Invite Participants

After deployment, share the site URL with the join parameter:

```text
https://YOUR-SITE-URL/?join=group26
```

Each browser/device gets an anonymous Firebase identity. A participant can edit
only the record owned by that identity. Clearing site data creates a new
identity, so participants should not clear browser data during the challenge.

## Privacy Note

The app UI intentionally does not show individual point totals to the group.
Everyone can see:

- who has joined
- who has participated today
- team points for today
- team points for the month
- previous-day 400 club

This is a small-group web app. Authenticated participants can technically read
the shared Firebase data that powers the group totals, but the app does not
present individual scores in the interface. Stronger privacy would require a
server-side aggregation layer such as Cloud Functions.

## Deploy With GitHub Pages

1. Push this folder to its own GitHub repository.
2. Enable GitHub Pages for the repository's main branch and root folder.
3. Open the published URL and confirm Firebase loads correctly.
4. Visit the invite URL and join from a test device.
5. Confirm that logging activities updates team totals.
6. Install the app on a phone and verify it opens normally.

All files in this folder, including `firebase-config.js`,
`manifest.webmanifest`, `service-worker.js`, `database.rules.json`, and
`icons/`, should be included in the repository.
