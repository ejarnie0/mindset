"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { socket } from "../../lib/socket";

export default function JoinPage() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const joinRoom = () => {
    const trimmedName = name.trim();
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedName || !trimmedCode) {
      setError("Enter your name and room code.");
      return;
    }

    setError("");

    if (!socket.connected) {
      socket.connect();
    }

    socket.emit(
      "player:join-room",
      { code: trimmedCode, name: trimmedName },
      (res: any) => {
        if (res.ok) {
          localStorage.setItem("playerId", res.playerId);
          localStorage.setItem("playerName", trimmedName);
          router.push(`/room/${trimmedCode}`);
        } else {
          setError(res.error || "Could not join room.");
        }
      }
    );
  };

  return (
    <main className="min-h-screen bg-[#97E7F5] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1fr_0.9fr]">
          <section className="rounded-[32px] border-4 border-[#01377D] bg-white p-8 shadow-[0_14px_0_#01377D]">
            <div className="mb-6 inline-block rounded-full bg-[#7ED348] px-4 py-2 font-black text-[#01377D]">
              Join a Room
            </div>

            <h1 className="mb-4 text-5xl font-black leading-tight text-[#01377D]">
              Jump into the game
            </h1>

            <p className="mb-8 max-w-xl text-lg font-semibold leading-relaxed text-[#01377D]">
              Enter your name and the room code from the host screen to join on
              your phone.
            </p>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-bold uppercase tracking-[0.15em] text-[#01377D]"
                >
                  Your Name
                </label>
                <input
                  id="name"
                  className="w-full rounded-2xl border-2 border-[#01377D] bg-[#EAFBFE] p-4 text-lg font-semibold text-[#01377D] outline-none transition focus:scale-[1.01] focus:bg-white"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="code"
                  className="mb-2 block text-sm font-bold uppercase tracking-[0.15em] text-[#01377D]"
                >
                  Room Code
                </label>
                <input
                  id="code"
                  className="w-full rounded-2xl border-2 border-[#01377D] bg-[#EAFBFE] p-4 text-lg font-black uppercase tracking-[0.2em] text-[#01377D] outline-none transition focus:scale-[1.01] focus:bg-white"
                  placeholder="ABCD"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </div>

              {error && (
                <div className="rounded-2xl bg-[#01377D] px-4 py-3 font-bold text-white">
                  {error}
                </div>
              )}

              <button
                onClick={joinRoom}
                className="w-full rounded-3xl bg-[#26B170] px-8 py-5 text-xl font-black text-white shadow-[0_8px_0_#01377D] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#01377D]"
              >
                Join Game
              </button>
            </div>
          </section>

          <aside className="rounded-[32px] bg-[#01377D] p-8 text-white shadow-[0_14px_0_#009DD1]">
            <h2 className="mb-5 text-3xl font-black">Quick steps</h2>

            <div className="space-y-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="mb-1 text-sm font-bold uppercase tracking-[0.15em] opacity-80">
                  Step 1
                </p>
                <p className="text-lg font-bold">
                  Ask the host to create a room on their laptop.
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="mb-1 text-sm font-bold uppercase tracking-[0.15em] opacity-80">
                  Step 2
                </p>
                <p className="text-lg font-bold">
                  Type in the room code exactly as shown.
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="mb-1 text-sm font-bold uppercase tracking-[0.15em] opacity-80">
                  Step 3
                </p>
                <p className="text-lg font-bold">
                  Wait for the round to begin and make your choice fast.
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 p-4">
                <p className="mb-1 text-sm font-bold uppercase tracking-[0.15em] opacity-80">
                  Goal
                </p>
                <p className="text-lg font-bold">
                  Predict your friends correctly and climb the leaderboard.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}