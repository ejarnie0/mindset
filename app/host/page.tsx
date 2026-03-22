"use client";

import { useEffect, useState } from "react";
import { socket } from "../../lib/socket";

export default function HostPage() {
  const [room, setRoom] = useState<any>(null);

  useEffect(() => {
    socket.connect();

    socket.on("room:update", (updatedRoom) => {
      setRoom(updatedRoom);
    });

    return () => {
      socket.off("room:update");
    };
  }, []);

  const createRoom = () => {
    socket.emit("host:create-room", { hostName: "Host" }, (res: any) => {
      if (res.ok) setRoom(res.room);
    });
  };

  const startRound = () => {
    socket.emit("game:start-round", { code: room.code });
  };

  const nextRound = () => {
    socket.emit("game:next-round", { code: room.code });
  };

  return (
    <main className="min-h-screen bg-[#01377D] text-white p-6">
      {!room ? (
        <button
          onClick={createRoom}
          className="rounded-2xl bg-[#7ED348] px-6 py-4 text-2xl font-bold"
        >
          Create Room
        </button>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="rounded-3xl bg-white text-[#01377D] p-6">
            <h1 className="text-4xl font-black">Room Code: {room.code}</h1>
            <p className="mt-2 text-lg">Players join on their phones.</p>
          </div>

          <div className="rounded-3xl bg-[#97E7F5] text-[#01377D] p-6">
            <h2 className="text-2xl font-bold mb-4">Players</h2>
            <ul className="space-y-2">
              {room.players.map((player: any) => (
                <li key={player.id} className="font-semibold">
                  {player.name} — {player.score} pts
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-4">
            <button
              onClick={startRound}
              className="rounded-2xl bg-[#009DD1] px-6 py-4 text-xl font-bold"
            >
              Start Round
            </button>

            <button
              onClick={nextRound}
              className="rounded-2xl bg-[#26B170] px-6 py-4 text-xl font-bold"
            >
              Reset / Next Round
            </button>
          </div>

          {room.round && (
            <div className="rounded-3xl bg-white text-[#01377D] p-6">
              <h2 className="text-2xl font-bold mb-2">Current Round</h2>
              <p><strong>Status:</strong> {room.status}</p>
              <p><strong>Question:</strong> {room.round.question?.prompt}</p>
              {room.status === "results" && (
                <p>
                  <strong>Correct answer:</strong>{" "}
                  {room.round.question?.options[room.round.chosenAnswerIndex]}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}