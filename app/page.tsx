"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

export default function HomePage() {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <main className="min-h-screen bg-[#97E7F5] px-6 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="w-full rounded-[32px] border-4 border-[#01377D] bg-white p-8 shadow-[0_14px_0_#01377D] lg:p-10">
          <div className="mb-6 inline-block rounded-full bg-[#7ED348] px-4 py-2 font-black text-[#01377D]">
            Multiplayer Party Game
          </div>

          <h1 className="mb-4 text-5xl font-black leading-tight text-[#01377D] sm:text-6xl">
            Mindset
          </h1>

          <p className="mb-8 max-w-2xl text-lg font-semibold leading-relaxed text-[#01377D]">
            Guess how your friends think. One player answers the question,
            everyone else tries to predict what they chose, and the leaderboard
            keeps score.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/host"
              className="rounded-3xl bg-[#009DD1] px-8 py-5 text-center text-xl font-black text-white shadow-[0_8px_0_#01377D] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#01377D]"
            >
              Host Game
            </Link>

            <Link
              href="/join"
              className="rounded-3xl bg-[#26B170] px-8 py-5 text-center text-xl font-black text-white shadow-[0_8px_0_#01377D] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#01377D]"
            >
              Join Game
            </Link>

            <button
              onClick={() => setShowInstructions(true)}
              className="rounded-3xl border-4 border-[#01377D] bg-white px-8 py-5 text-center text-xl font-black text-[#01377D] transition hover:-translate-y-0.5"
            >
              How to Play
            </button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border-2 border-[#97E7F5] bg-[#EAFBFE] p-4">
              <p className="text-sm font-bold uppercase tracking-[0.15em] text-[#01377D]">
                1
              </p>
              <p className="mt-2 font-bold text-[#01377D]">Create a room</p>
            </div>

            <div className="rounded-2xl border-2 border-[#97E7F5] bg-[#EAFBFE] p-4">
              <p className="text-sm font-bold uppercase tracking-[0.15em] text-[#01377D]">
                2
              </p>
              <p className="mt-2 font-bold text-[#01377D]">Join on phones</p>
            </div>

            <div className="rounded-2xl border-2 border-[#97E7F5] bg-[#EAFBFE] p-4">
              <p className="text-sm font-bold uppercase tracking-[0.15em] text-[#01377D]">
                3
              </p>
              <p className="mt-2 font-bold text-[#01377D]">Guess and score</p>
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
  {showInstructions && (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto"
      onClick={() => setShowInstructions(false)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[32px] border-4 border-[#01377D] bg-white p-6 sm:p-8 shadow-[0_14px_0_#01377D]"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.22 }}
      >
        <div className="mb-6 flex items-start justify-between gap-4 sticky top-0 bg-white pb-4 z-10">
          <div>
            <div className="mb-3 inline-block rounded-full bg-[#7ED348] px-4 py-2 font-black text-[#01377D]">
              Game Instructions
            </div>
            <h2 className="text-4xl font-black text-[#01377D]">
              How to Play
            </h2>
          </div>

          <button
            onClick={() => setShowInstructions(false)}
            className="rounded-full bg-[#01377D] px-4 py-2 text-lg font-black text-white"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-[#EAFBFE] p-4">
            <p className="mb-1 text-sm font-bold uppercase tracking-[0.15em] text-[#01377D]">
              Step 1
            </p>
            <p className="text-lg font-bold text-[#01377D]">
              One person hosts the game and creates a room.
            </p>
          </div>

          <div className="rounded-2xl bg-[#EAFBFE] p-4">
            <p className="mb-1 text-sm font-bold uppercase tracking-[0.15em] text-[#01377D]">
              Step 2
            </p>
            <p className="text-lg font-bold text-[#01377D]">
              Everyone else joins on their phones using the room code.
            </p>
          </div>

          <div className="rounded-2xl bg-[#EAFBFE] p-4">
            <p className="mb-1 text-sm font-bold uppercase tracking-[0.15em] text-[#01377D]">
              Step 3
            </p>
            <p className="text-lg font-bold text-[#01377D]">
              One player gets a question with four possible answers.
            </p>
          </div>

          <div className="rounded-2xl bg-[#EAFBFE] p-4">
            <p className="mb-1 text-sm font-bold uppercase tracking-[0.15em] text-[#01377D]">
              Step 4
            </p>
            <p className="text-lg font-bold text-[#01377D]">
              That player secretly chooses the answer that fits them best.
            </p>
          </div>

          <div className="rounded-2xl bg-[#EAFBFE] p-4">
            <p className="mb-1 text-sm font-bold uppercase tracking-[0.15em] text-[#01377D]">
              Step 5
            </p>
            <p className="text-lg font-bold text-[#01377D]">
              Everyone else tries to guess which answer they picked.
            </p>
          </div>

          <div className="rounded-2xl bg-[#7ED348] p-4">
            <p className="mb-1 text-sm font-bold uppercase tracking-[0.15em] text-[#01377D]">
              Scoring
            </p>
            <p className="text-lg font-bold text-[#01377D]">
              Correct guessers earn points, and the answering player earns
              points for fooling people.
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
    </main>
  );
}