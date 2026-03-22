"use client";

import { useEffect, useMemo, useState } from "react";
import { socket } from "../../../lib/socket";
import { useParams } from "next/navigation";

export default function PlayerRoomPage() {
  const params = useParams();
  const code = useMemo(() => String(params.code).toUpperCase(), [params.code]);

  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [room, setRoom] = useState<any>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Connecting...");

  useEffect(() => {
    const savedPlayerId = localStorage.getItem("playerId");
    setPlayerId(savedPlayerId);

    if (!socket.connected) {
      socket.connect();
    }

    const handleRoomUpdate = (updatedRoom: any) => {
      setRoom(updatedRoom);
      setStatusMessage("");
    };

    socket.on("room:update", handleRoomUpdate);

    socket.emit("room:get-state", { code }, (res: any) => {
      if (res?.ok) {
        setRoom(res.room);
        setStatusMessage("");
      } else {
        setStatusMessage(res?.error || "Room not found");
      }
    });

    return () => {
      socket.off("room:update", handleRoomUpdate);
    };
  }, [code]);

  useEffect(() => {
    setHasSubmitted(false);
  }, [room?.round?.question?.id]);

  if (!playerId) {
    return (
      <main className="min-h-screen bg-[#97E7F5] p-4 flex items-center justify-center">
        <div className="rounded-3xl bg-white border-4 border-[#01377D] p-6 shadow-xl text-[#01377D] font-bold">
          Loading player...
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="min-h-screen bg-[#97E7F5] p-4 flex items-center justify-center">
        <div className="rounded-3xl bg-white border-4 border-[#01377D] p-6 shadow-xl text-[#01377D] font-bold">
          {statusMessage}
        </div>
      </main>
    );
  }

  const isAnsweringPlayer = room.round?.answeringPlayerId === playerId;
  const answeringPlayer = room.players?.find(
    (p: any) => p.id === room.round?.answeringPlayerId
  );

  const submitAnswer = (index: number) => {
    socket.emit("player:submit-answer", { code, answerIndex: index });
  };

  const submitGuess = (index: number) => {
    socket.emit("player:submit-guess", { code, guessIndex: index });
  };

  const getPhaseMessage = () => {
    if (!room.round) return "Waiting for next round...";

    if (room.status === "answering") {
      return isAnsweringPlayer
        ? "Pick the answer you think fits you best."
        : `Waiting for ${answeringPlayer?.name || "player"} to answer...`;
    }

    if (room.status === "guessing") {
      return isAnsweringPlayer
        ? "Nice. Waiting for everyone else to guess..."
        : `Guess what ${answeringPlayer?.name || "this player"} picked.`;
    }

    if (room.status === "results") {
      return "Round complete!";
    }

    return "";
  };

  return (
    <main className="min-h-screen bg-[#97E7F5] p-4">
      <div className="max-w-lg mx-auto rounded-[28px] bg-white border-4 border-[#01377D] p-6 shadow-[0_12px_0_#01377D]">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h1 className="text-3xl font-black text-[#01377D]">Mindset</h1>
          <div className="rounded-full bg-[#7ED348] px-4 py-2 font-bold text-[#01377D]">
            {room.code}
          </div>
        </div>

        {typeof room.timeLeft === "number" && room.status !== "results" && (
          <div className="mb-4 inline-block rounded-full bg-[#01377D] px-4 py-2 text-white font-bold">
            ⏱ {room.timeLeft}s
          </div>
        )}

        <p className="mb-5 text-[#01377D] font-semibold">{getPhaseMessage()}</p>

        {!room.round && (
          <div className="rounded-2xl bg-[#EAFBFE] p-5 text-[#01377D] font-semibold">
            Waiting for the host to start the next round...
          </div>
        )}

        {room.round && (
          <>
            <div className="rounded-2xl bg-[#EAFBFE] p-5 mb-4 border-2 border-[#97E7F5]">
              <p className="text-[#01377D] text-lg font-bold">
                {room.round.question.prompt}
              </p>
            </div>

            <div className="grid gap-3">
              {room.round.question.options.map((option: string, index: number) => {
                const shouldDisable =
                  hasSubmitted ||
                  room.status === "results" ||
                  (!isAnsweringPlayer && room.status === "answering") ||
                  (isAnsweringPlayer && room.status === "guessing");

                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (shouldDisable) return;

                      setHasSubmitted(true);

                      if (isAnsweringPlayer) {
                        submitAnswer(index);
                      } else {
                        submitGuess(index);
                      }
                    }}
                    disabled={shouldDisable}
                    className="rounded-2xl bg-[#009DD1] text-white font-bold p-4 text-left shadow-[0_6px_0_#01377D] transition hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#01377D] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {hasSubmitted && room.status !== "results" && (
              <div className="mt-4 rounded-2xl bg-[#26B170] p-4 text-white font-bold">
                Answer locked in. Waiting for the round to continue...
              </div>
            )}

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