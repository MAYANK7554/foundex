# Campus Lost & Found Matcher

A lost-and-found board for a college campus that auto-scores lost reports
against found reports (category + description similarity + location +
recency) and notifies both sides on a strong match.

## Structure

```
campus-lost-found/
  backend/     Node + Express + MongoDB API, matching engine
  frontend/    React + Vite + Tailwind UI
```

## 1. Prerequisites

- Node.js 18+
- MongoDB running locally (`brew install mongodb-community` on Mac, or use
  a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster and skip
  local install)

## 2. Backend setup

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set:
- `MONGO_URI` — local (`mongodb://localhost:27017/campus-lost-found`) or your Atlas URI
- `JWT_SECRET` — any long random string
- `COLLEGE_EMAIL_DOMAINS` — comma-separated list, e.g. `nsut.ac.in,nsit.net.in`
- SMTP settings are optional — leave blank and emails just get logged to
  the terminal instead of actually sending, which is fine for a demo.

Then run it:

```bash
npm run dev
```

Should print `[db] connected` and `[server] listening on http://localhost:5000`.

## 3. Frontend setup

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the printed URL (usually `http://localhost:5173`). The dev server
proxies `/api/*` to the backend on port 5000, so both need to be running.

## 4. Try it out

1. Register two accounts with your college email domain (e.g.
   `priya@nsut.ac.in` and `arjun@nsut.ac.in`) — open one in a normal window
   and one in an incognito window so you're logged in as both at once.
2. As user A: **Report found** something, e.g. category "Wallet / Purse",
   description "dark brown wallet found near the library", set a
   verification question like "What's stitched inside the wallet?" with
   an answer.
3. As user B: **Report lost** something similar, e.g. "black leather
   wallet lost near the library", same category, similar date.
4. You should see a scored match appear immediately (and if it's a strong
   one, both users get a console-logged "email").
5. As user B, click **This might be mine — start a claim**, answer the
   verification question.
6. As user A, open **My reports → that item**, review the claim, and
   approve or reject it.

## 5. Make a user an admin (security desk)

There's no signup toggle for this on purpose. After registering, open a
Mongo shell and flip the role manually:

```js
use campus-lost-found
db.users.updateOne({ email: "you@nsut.ac.in" }, { $set: { role: "admin" } })
```

Log out and back in, and a "Security desk" link appears in the nav with
campus-wide stats and every report.

## How the matching engine works

`backend/utils/matching.js` is the whole "smart" part, deliberately kept
explainable instead of a black box:

- **Category** is a hard filter — a charger will never match a water bottle.
- **Text similarity** — TF-IDF cosine similarity between the two
  descriptions (`natural` npm package, no external API calls).
- **Location proximity** — campus locations are grouped into zones
  (`backend/utils/locations.js`); same building scores highest, same zone
  scores partial credit, different zone scores low but nonzero.
- **Time proximity** — reports within 3 days of each other score full
  marks, decaying to zero by 21 days apart.

These four combine into one weighted score (see `WEIGHTS` in
`matching.js`). Scores ≥ 0.7 auto-notify both sides by email; 0.4–0.7 show
up as "possible matches" for the user to review themselves. Both
thresholds and weights are just constants at the top of the file — tune
them once you see real data from your campus.

Image matching was deliberately left out: category + location + text
description already resolves the overwhelming majority of matches, and
the final "yes, that's mine" call is better left to a human looking at
the item than an algorithm comparing photos.

## Next steps if you keep building this

- Swap the campus location list in `backend/utils/locations.js` for your
  actual college's building names/zones.
- Add photo upload (e.g. to S3 or Cloudinary) — the schema already has an
  unused `photoUrl` field on `Item`, it's just not wired to file storage.
- Rate-limit report creation per user to avoid spam.
- Add a "still looking" reminder email after N days for active lost items.
