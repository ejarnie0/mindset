"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { socket } from "../../lib/socket";

function dedupePlayers<T extends { id: string }>(players: T[]): T[] {
  return Array.from(
    new Map(players.map((p) => [p.id, p])).values()
  );
}

function normalizeRoom(room: any) {
  if (!room) return room;
  return {
    ...room,
    players: dedupePlayers(room.players ?? []),
  };
}

export default function HostPage() {
  const [room, setRoom] = useState<any>(null);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleRoomUpdate = (updatedRoom: any) => {
      setRoom(normalizeRoom(updatedRoom));
    };

    socket.on("room:update", handleRoomUpdate);

    return () => {
      socket.off("room:update", handleRoomUpdate);
    };
  }, []);

  const createRoom = () => {
    socket.emit("host:create-room", { hostName: "Host" }, (res: any) => {
      if (res.ok) {
        setRoom(normalizeRoom(res.room));
      }
    });
  };

  const startRound = () => {
    if (!room) return;
    socket.emit("game:start-round", { code: room.code });
  };

  const playAgain = () => {
    if (!room) return;
    socket.emit("game:play-again", { code: room.code });
  };

  const leaderboardPlayers = useMemo(() => {
    if (!room?.players) return [];
    return dedupePlayers(room.players.filter((p: any) => !p.isHost)).sort(
      (a: any, b: any) => b.score - a.score
    );
  }, [room]);

  const answeringPlayer = room?.players?.find(
    (p: any) => p.id === room?.round?.answeringPlayerId
  );

  const roundPointLines = useMemo(() => {
    if (!room?.round?.results) return [];
    const lines: string[] = [];
    for (const gr of room.round.results.guessResults) {
      if (gr.wasCorrect) lines.push(`${gr.name} got a point!`);
    }
    return lines;
  }, [room?.round?.results]);

  const getStatusLabel = () => {
    if (!room) return "";
    if (room.winner) return `${room.winner.name} wins!`;
    if (room.status === "lobby") return "Waiting in lobby";
    if (room.status === "answering") {
      return `${answeringPlayer?.name || "A player"} is answering`;
    }
    if (room.status === "guessing") return "Players are guessing";
    if (room.status === "intermission") return "Between rounds — waiting on phones";
    return room.status;
  };

  const gameInProgress =
    room &&
    (room.status === "answering" ||
      room.status === "guessing" ||
      room.status === "intermission");

  return (
    <main className="min-h-screen bg-[#97E7F5] p-6">
      {!room ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="rounded-[32px] border-4 border-[#01377D] bg-white p-8 shadow-[0_14px_0_#01377D] text-center max-w-xl w-full">
            <h1 className="text-5xl font-black text-[#01377D] mb-3">Mindset</h1>
            <p className="text-[#01377D] text-lg font-semibold mb-4">
              Host the game and let everyone join on their phones.
            </p>
            <p className="text-[#01377D] font-bold mb-8">
              Open this laptop's Wi-Fi IP on other devices.
            </p>

            <button
              onClick={createRoom}
              className="rounded-3xl bg-[#009DD1] px-8 py-5 text-2xl font-black text-white shadow-[0_8px_0_#01377D] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#01377D]"
            >
              Create Room
            </button>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.3fr_0.8fr]">
          <section className="rounded-[32px] border-4 border-[#01377D] bg-white p-6 shadow-[0_14px_0_#01377D]">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#01377D]">
                  Mindset
                </p>
                <h1 className="text-5xl font-black text-[#01377D]">
                  Room {room.code}
                </h1>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="rounded-full bg-[#7ED348] px-5 py-3 font-black text-[#01377D]">
                  {getStatusLabel()}
                </div>

                {typeof room.timeLeft === "number" &&
                  room.status !== "intermission" &&
                  room.status !== "finished" && (
                    <div className="rounded-full bg-[#01377D] px-5 py-3 font-black text-white">
                      ⏱ {room.timeLeft}s
                    </div>
                  )}
              </div>
            </div>

            {room.winner && (
              <div className="mb-8 rounded-3xl bg-[#26B170] p-6 text-white">
                <p className="text-sm font-bold uppercase tracking-[0.18em]">
                  Winner
                </p>
                <p className="mt-2 text-3xl font-black md:text-4xl">
                  {room.winner.name} reached 10 points
                </p>
                <button
                  onClick={playAgain}
                  className="mt-5 rounded-2xl bg-white px-6 py-3 text-lg font-black text-[#01377D] shadow-[0_6px_0_#01377D] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#01377D]"
                >
                  Play Again
                </button>
              </div>
            )}

            {room.status === "lobby" && !room.round && (
              <div className="mb-8 space-y-6">
                <p className="text-xl font-bold text-[#01377D]">
                  When everyone has joined, start the first round.
                </p>
                <button
                  onClick={startRound}
                  disabled={
                    room.winner ||
                    room.players.filter((p: any) => !p.isHost).length < 2
                  }
                  className="rounded-2xl bg-[#009DD1] px-6 py-4 text-lg font-black text-white shadow-[0_6px_0_#01377D] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#01377D] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  Start Round
                </button>
              </div>
            )}

            {room.round && (
              <div className="flex min-h-[280px] flex-col justify-center gap-8">
                <div className="rounded-3xl border-4 border-[#01377D] bg-[#EAFBFE] px-6 py-8 md:px-10 md:py-10">
                  <p className="mb-4 text-sm font-black uppercase tracking-[0.2em] text-[#01377D]/70">
                    Question
                  </p>
                  <p className="text-2xl font-black leading-tight text-[#01377D] md:text-3xl lg:text-4xl">
                    {room.round.question.prompt}
                  </p>
                </div>

                {room.status === "intermission" && room.round.results && (
                  <>
                    <div className="rounded-3xl bg-[#26B170] px-6 py-6 text-center text-white md:px-8 md:py-8">
                      <p className="mb-2 text-sm font-black uppercase tracking-[0.2em] opacity-90">
                        Correct answer
                      </p>
                      <p className="text-2xl font-black md:text-4xl">
                        {
                          room.round.question.options[
                            room.round.results.correctAnswerIndex
                          ]
                        }
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          <aside className="flex min-h-[min(520px,75vh)] flex-col rounded-[32px] bg-[#01377D] p-6 text-white shadow-[0_14px_0_#009DD1]">
            <h2 className="mb-5 text-3xl font-black">Leaderboard</h2>

            <div className="space-y-3">
              {leaderboardPlayers.map((player: any, index: number) => (
                (() => {
                  const isWinner = room?.winner?.id === player.id;
                  return (
                <motion.div
                  layout
                  key={player.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className={`flex items-center justify-between rounded-2xl p-4 ${
                    isWinner ? "bg-[#26B170] text-white" : "bg-white/10"
                  }`}
                >
                  <div>
                    <p className={`text-sm ${isWinner ? "opacity-95" : "opacity-80"}`}>
                      #{index + 1}
                    </p>
                    <p className="text-xl font-bold">{player.name}</p>
                  </div>

                  <motion.div
                    layout
                    className={`rounded-full px-4 py-2 font-black ${
                      isWinner
                        ? "bg-white text-[#26B170]"
                        : "bg-[#7ED348] text-[#01377D]"
                    }`}
                  >
                    {player.score}
                  </motion.div>
                </motion.div>
                  );
                })()
              ))}
            </div>

            {room.status === "intermission" && roundPointLines.length > 0 && (
              <div className="mt-auto border-t border-white/20 pt-6">
                <p className="mb-3 text-right text-xs font-bold uppercase tracking-[0.18em] text-white/60">
                  This round
                </p>
                <div className="space-y-2 text-right">
                  {roundPointLines.map((line, i) => (
                    <motion.p
                      key={`${line}-${i}`}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.08 }}
                      className="text-lg font-bold leading-snug text-[#7ED348] md:text-xl"
                    >
                      {line}
                    </motion.p>
                  ))}
                </div>
              </div>
            )}

            {!gameInProgress && (
              <div className="mt-6 rounded-3xl bg-white/10 p-5">
                <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] opacity-80">
                  Players
                </p>

                <div className="space-y-2">
                  {room.players
                    .filter((player: any) => !player.isHost)
                    .map((player: any) => (
                    <motion.div
                      layout
                      key={player.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      className="font-semibold"
                    >
                      {player.name}
                    </motion.div>
                    ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
