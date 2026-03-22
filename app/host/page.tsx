"use client";

import { useEffect, useMemo, useState } from "react";
import { socket } from "../../lib/socket";

export default function HostPage() {
  const [room, setRoom] = useState<any>(null);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    const handleRoomUpdate = (updatedRoom: any) => {
      setRoom(updatedRoom);
    };

    socket.on("room:update", handleRoomUpdate);

    return () => {
      socket.off("room:update", handleRoomUpdate);
    };
  }, []);

  const createRoom = () => {
    socket.emit("host:create-room", { hostName: "Host" }, (res: any) => {
      if (res.ok) {
        setRoom(res.room);
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
    return [...room.players].sort((a, b) => b.score - a.score);
  }, [room]);

  const answeringPlayer = room?.players?.find(
    (p: any) => p.id === room?.round?.answeringPlayerId
  );

  const getStatusLabel = () => {
    if (!room) return "";
    if (room.status === "lobby") return "Waiting in lobby";
    if (room.status === "answering") {
      return `${answeringPlayer?.name || "A player"} is answering`;
    }
    if (room.status === "guessing") {
      return "Players are guessing";
    }
    if (room.status === "results") {
      return "Round results";
    }
    return room.status;
  };

  return (
    <main className="min-h-screen bg-[#97E7F5] p-6">
      {!room ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="rounded-[32px] border-4 border-[#01377D] bg-white p-8 shadow-[0_14px_0_#01377D] text-center max-w-xl w-full">
            <h1 className="text-5xl font-black text-[#01377D] mb-3">Mindset</h1>
            <p className="text-[#01377D] text-lg font-semibold mb-8">
              Host the game and let everyone join on their phones.
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

                {typeof room.timeLeft === "number" && room.status !== "results" && (
                  <div className="rounded-full bg-[#01377D] px-5 py-3 font-black text-white">
                    ⏱ {room.timeLeft}s
                  </div>
                )}
              </div>
            </div>

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
                    {room.round.question.options.map((option: string, index: number) => {
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
                    })}
                  </div>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={startRound}
                disabled={room.status !== "lobby"}
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

            {room.status === "results" && room.round && (
              <div className="mt-6 rounded-3xl bg-[#7ED348] p-5 text-[#01377D]">
                <p className="text-sm font-bold uppercase tracking-[0.18em]">
                  Correct Answer
                </p>
                <p className="mt-2 text-3xl font-black">
                  {room.round.question.options[room.round.chosenAnswerIndex]}
                </p>
              </div>
            )}
          </section>

          <aside className="rounded-[32px] bg-[#01377D] p-6 text-white shadow-[0_14px_0_#009DD1]">
            <h2 className="mb-5 text-3xl font-black">Leaderboard</h2>

            <div className="space-y-3">
              {sortedPlayers.map((player: any, index: number) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded-2xl bg-white/10 p-4"
                >
                  <div>
                    <p className="text-sm opacity-80">#{index + 1}</p>
                    <p className="text-xl font-bold">
                      {player.name} {player.isHost ? "(Host)" : ""}
                    </p>
                  </div>

                  <div className="rounded-full bg-[#7ED348] px-4 py-2 font-black text-[#01377D]">
                    {player.score}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl bg-white/10 p-5">
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] opacity-80">
                Players
              </p>

              <div className="space-y-2">
                {room.players.map((player: any) => (
                  <div key={player.id} className="font-semibold">
                    {player.name}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}