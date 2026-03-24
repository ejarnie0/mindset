# Mindset

**Mindset** is a party game for a group in the same room. One person at a time privately picks an answer to a multiple choice style questionnaire. Everyone else tries to guess what that person would choose. The game keeps score on a live leaderboard and ends once someone gets to 10 points.

## How to play

1. **Host** opens the host screen on a laptop or tablet and **creates a room**. A room code will then appear.
2. **Players** join on their phones with their name and that code.
3. When **at least** two players have joined, the host pushes the **Start round** button.
4. Each round:
   - The game picks **one player** to be the **chooser** (the chooser rotates every round).
   - The chooser reads the question and **submits their real answer**. Each player gets 15s to answer!
   - Everyone else **guesses** which option the chooser picked. Each player gets 15s to answer!
   - When everyone has guessed or time runs out, **results** show the correct answer and who scored.
5. **Between rounds**, each player taps **Next question!** when they’re ready. The next round starts once **everyone** has pressed it.
6. The game **ends** when someone reaches **10 points**.

## Scoring

Correct guessers earn one point for every answer!
- The **host** does not play and does not appear on the leaderboard.

## Questions

Prompts live in `data/questions.json`. Each question has a unique `id`, a `prompt`, and either **two** options (e.g. True/False) or **four** options. During a single room session, **the same question is not used twice** until every question in the file has been played once; then the deck resets so the game can continue.

## Tech stack

- **Next.js** (React) — player join flow, in-room UI, host display
- **Node** + **Express** + **Socket.IO** — real-time room state, rounds, and scoring (`server/index.js`)

## Run locally

You need **two terminals**: one for the web app and one for the socket server.

```bash
npm install
```

Terminal 1 — Next.js (port **3000**, bound to all interfaces so phones on your Wi‑Fi can connect):

```bash
npm run dev
```

Terminal 2 — Socket server (port **3001** by default):

```bash
npm run socket
```

Open the app at `http://localhost:3000` on the host machine, or `http://<your-computer-LAN-IP>:3000` from phones on the same network.

## Deploying (overview)

- **Frontend:** deploy the Next.js app (e.g. **Vercel**).
- **Realtime server:** run `node server/index.js` somewhere that supports long-lived processes (e.g. **Railway**). The platform usually sets `PORT`; the server reads it automatically.

Set **`NEXT_PUBLIC_SOCKET_URL`** on the frontend host to your **public HTTPS** socket URL (no trailing slash). See `.env.example` for a short checklist.

Optional: this repo includes a **`Dockerfile`** suited to running only the socket service, and **`railway.json`** with a start command for Railway.

## Project layout (high level)

| Path | Role |
|------|------|
| `app/` | Next.js routes (home, join, host, room by code) |
| `server/index.js` | Socket.IO game logic and rooms |
| `data/questions.json` | Question bank |
| `lib/socket.ts` | Client Socket.IO connection (env-aware URL) |

---

Have fun — and may the best mind-reader win.
