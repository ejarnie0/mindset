"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { useParams } from "next/navigation";

export default function PlayerRoomPage() {
  const params = useParams();
  const code = params.code as string;

  const [room, setRoom] = useState<any>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const savedPlayerId = localStorage.getItem("playerId");
    setPlayerId(savedPlayerId);

    socket.on("room:update", (updatedRoom) => {
      setRoom(updatedRoom);
    });

    return () => {
      socket.off("room:update");
    };
  }, []);

  if (!room || !playerId) {
    return <main className="p-6">Waiting for room...</main>;
  }

  const isAnsweringPlayer = room.round?.answeringPlayerId === playerId;

  const submitAnswer = (index: number) => {
    socket.emit("player:submit-answer", { code, answerIndex: index });
  };

  const submitGuess = (index: number) => {
    socket.emit("player:submit-guess", { code, guessIndex: index });
  };

  return (
    <main className="min-h-screen bg-[#97E7F5] p-4">
      <div className="max-w-lg mx-auto rounded-3xl bg-white border-4 border-[#01377D] p-6 shadow-xl">
        <h1 className="text-3xl font-black text-[#01377D] mb-4">Mindset</h1>

        {!room.round && <p className="text-lg text-[#01377D]">Waiting for next round...</p>}

        {room.round && (
          <>
            <p className="text-[#01377D] font-semibold mb-4">{room.round.question.prompt}</p>

            <div className="grid gap-3">
              {room.round.question.options.map((option: string, index: number) => (
                <button
                  key={index}
                  onClick={() =>
                    isAnsweringPlayer ? submitAnswer(index) : submitGuess(index)
                  }
                  className="rounded-2xl bg-[#009DD1] text-white font-bold p-4"
                >
                  {option}
                </button>
              ))}
            </div>

            {room.status === "results" && (
              <div className="mt-6 rounded-2xl bg-[#7ED348] p-4 text-[#01377D] font-bold">
                Correct answer:{" "}
                {room.round.question.options[room.round.chosenAnswerIndex]}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}