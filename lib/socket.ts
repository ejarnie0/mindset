"use client";

import { io } from "socket.io-client";

/**
 * Production (Vercel): set NEXT_PUBLIC_SOCKET_URL to your Railway Socket.IO URL
 * (e.g. https://mindset-socket.up.railway.app — no trailing slash). Vercel only
 * hosts the Next app; run `node server/index.js` on Railway (or similar).
 *
 * Local / LAN: leave the env var unset; we use http://<current-host>:3001 so
 * phones on the same Wi‑Fi work with `npm run dev` + `npm run socket`.
 */
function resolveSocketUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  if (fromEnv) return fromEnv;

  if (typeof window === "undefined") {
    return "http://localhost:3001";
  }

  if (window.location.protocol === "https:") {
    console.warn(
      "[Mindset] NEXT_PUBLIC_SOCKET_URL is unset — add it in Vercel (Settings → Environment Variables) pointing at your Socket.IO server URL."
    );
  }

  const { hostname } = window.location;
  return `http://${hostname}:3001`;
}

export const socket = io(resolveSocketUrl(), {
  autoConnect: false,
});
