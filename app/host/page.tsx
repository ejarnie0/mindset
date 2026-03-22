"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { socket } from "../../lib/socket";

// ✅ Reusable dedup helper — keeps the LAST seen version of each player
function dedupePlayers<T extends { id: string }>(players: T[]): T[] {
  return Array.from(
    new Map(players.map((p) => [p.id, p])).values()
  );
}

// ✅ Normalize every room object before it touches state
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
      // ✅ Deduplicate before storing — nothing downstream ever sees dupes
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
        // ✅ Also normalize the initial room from the callback
        setRoom(normalizeRoom(res.room));
      }
    });
  };

  const startRound = () => {
    if (!room) return;
    socket.emit("game:start-round", { code: room.code });
  };

  const nextRound = () => {
    if (!room) return;
    socket.emit("game:next-round", { code: room.code });
  };

  const sortedPlayers = useMemo(() => {
    if (!room?.players) return [];
    // ✅ Defensive dedup here too — belt-and-suspenders
    return dedupePlayers([...room.players]).sort(
      (a: any, b: any) => b.score - a.score
    );
  }, [room]);

  const answeringPlayer = room?.players?.find(
    (p: any) => p.id === room?.round?.answeringPlayerId
  );

  const getStatusLabel = () => {
    if (!room) return "";
    if (room.winner) return `${room.winner.name} wins!`;
    if (room.status === "lobby") return "Waiting in lobby";
    if (room.status === "answering") {
      return `${answeringPlayer?.name || "A player"} is answering`;
    }
    if (room.status === "guessing") return "Players are guessing";
    if (room.status === "results") return "Round results";
    return room.status;
  };

  const getSubmissionLabel = () => {
    if (!room?.round) return "No active round";
    if (room.status === "answering") {
      return `${room.submittedCount || 0} / 1 answered`;
    }
    if (room.status === "guessing" || room.status === "results") {
      return `${room.submittedCount || 0} / ${room.totalGuessers || 0} guessed`;
    }
    return "";
  };

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
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-[#01377D]">
                  Host Dashboard
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
                  room.status !== "results" && (
                    <div className="rounded-full bg-[#01377D] px-5 py-3 font-black text-white">
                      ⏱ {room.timeLeft}s
                    </div>
                  )}
              </div>
            </div>

            <div className="mb-4 rounded-2xl bg-[#01377D] px-5 py-4 text-white">
              <p className="text-sm font-bold uppercase tracking-[0.18em] opacity-80">
                Submission Progress
              </p>
              <p className="mt-1 text-2xl font-black">{getSubmissionLabel()}</p>
            </div>

            {room.winner && (
              <div className="mb-6 rounded-3xl bg-[#26B170] p-5 text-white">
                <p className="text-sm font-bold uppercase tracking-[0.18em]">
                  Winner
                </p>
                <p className="mt-2 text-3xl font-black">
                  {room.winner.name} reached 10 points
                </p>
              </div>
            )}

            <div className="mb-6 rounded-3xl border-2 border-[#97E7F5] bg-[#EAFBFE] p-5">
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-[#01377D]">
                Current Round
              </p>

              {!room.round ? (
                <p className="text-xl font-bold text-[#01377D]">
                  Waiting for the next round to start.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-lg font-bold text-[#01377D]">
                    {room.round.question.prompt}
                  </p>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {room.round.question.options.map(
                      (option: string, index: number) => {
                        const isCorrect =
                          room.status === "results" &&
                          index === room.round.chosenAnswerIndex;

                        return (
                          <div
                            key={index}
                            className={`rounded-2xl border-2 p-4 font-bold ${
                              isCorrect
                                ? "border-[#26B170] bg-[#26B170] text-white"
                                : "border-[#97E7F5] bg-white text-[#01377D]"
                            }`}
                          >
                            {option}
                          </div>
                        );
                      }
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={startRound}
                disabled={
                  room.status !== "lobby" ||
                  room.winner ||
                  room.players.filter((p: any) => !p.isHost).length < 2
                }
                className="rounded-2xl bg-[#009DD1] px-6 py-4 text-lg font-black text-white shadow-[0_6px_0_#01377D] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#01377D] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                Start Round
              </button>

              <button
                onClick={nextRound}
                className="rounded-2xl bg-[#26B170] px-6 py-4 text-lg font-black text-white shadow-[0_6px_0_#01377D] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#01377D]"
              >
                Next Round
              </button>
            </div>

            {room.status === "results" && room.round?.results && (
              <div className="mt-6 space-y-4">
                <div className="rounded-3xl bg-[#7ED348] p-5 text-[#01377D]">
                  <p className="text-sm font-bold uppercase tracking-[0.18em]">
                    Correct Answer
                  </p>
                  <p className="mt-2 text-3xl font-black">
                    {room.round.question.options[room.round.chosenAnswerIndex]}
                  </p>
                </div>

                <div className="rounded-3xl border-2 border-[#97E7F5] bg-white p-5">
                  <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[#01377D]">
                    Round Results
                  </p>

                  <div className="space-y-3">
                    {room.round.results.guessResults.map((result: any) => (
                      <div
                        key={result.playerId}
                        className={`rounded-2xl p-4 font-bold ${
                          result.wasCorrect
                            ? "bg-[#26B170] text-white"
                            : "bg-[#EAFBFE] text-[#01377D]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p>{result.name}</p>
                            <p className="text-sm opacity-80">
                              Guessed:{" "}
                              {typeof result.guessIndex === "number"
                                ? room.round.question.options[result.guessIndex]
                                : "No guess"}
                            </p>
                          </div>
                          <div>{result.wasCorrect ? "+1" : "+0"}</div>
                        </div>
                      </div>
                    ))}

                    <div className="rounded-2xl bg-[#01377D] p-4 text-white font-bold">
                      {answeringPlayer?.name || "Answering player"} fooled{" "}
                      {room.round.results.answeringPlayerPoints} player
                      {room.round.results.answeringPlayerPoints === 1
                        ? ""
                        : "s"}{" "}
                      and gets +{room.round.results.answeringPlayerPoints}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="rounded-[32px] bg-[#01377D] p-6 text-white shadow-[0_14px_0_#009DD1]">
            <h2 className="mb-5 text-3xl font-black">Leaderboard</h2>

            <div className="space-y-3">
              {/* ✅ sortedPlayers is already deduped via useMemo above */}
              {sortedPlayers.map((player: any, index: number) => (
                <motion.div
                  layout
                  key={player.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="flex items-center justify-between rounded-2xl bg-white/10 p-4"
                >
                  <div>
                    <p className="text-sm opacity-80">#{index + 1}</p>
                    <p className="text-xl font-bold">
                      {player.name} {player.isHost ? "(Host)" : ""}
                    </p>
                  </div>

                  <motion.div
                    layout
                    className="rounded-full bg-[#7ED348] px-4 py-2 font-black text-[#01377D]"
                  >
                    {player.score}
                  </motion.div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl bg-white/10 p-5">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] opacity-80">
                Players
              </p>

              <div className="space-y-2">
                {/* ✅ room.players is already deduped via normalizeRoom */}
                {room.players.map((player: any) => (
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
          </aside>
        </div>
      )}
    </main>
  );
}
