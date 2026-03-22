"use client";

import { useEffect, useMemo, useState } from "react";
import { socket } from "../../../lib/socket";
import { useParams } from "next/navigation";

export default function PlayerRoomPage() {
  const params = useParams();
  const code = useMemo(() => String(params.code).toUpperCase(), [params.code]);

  const [room, setRoom] = useState<any>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Connecting...");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    const savedPlayerId = localStorage.getItem("playerId");
    const savedPlayerName = localStorage.getItem("playerName");

    setPlayerId(savedPlayerId);
    setPlayerName(savedPlayerName);

    if (!socket.connected) {
      socket.connect();
    }

    const requestState = () => {
      socket.emit("room:get-state", { code, playerName }, (res: any) => {
        if (res?.ok) {
          setRoom(res.room);
          setStatusMessage("");
        } else {
          setStatusMessage(res?.error || "Room not found");
        }
      });
    };

    const handleConnect = () => {
      requestState();
    };

    const handleRoomUpdate = (updatedRoom: any) => {
      setRoom(updatedRoom);
      setStatusMessage("");
    };

    socket.on("connect", handleConnect);
    socket.on("room:update", handleRoomUpdate);

    requestState();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("room:update", handleRoomUpdate);
    };
  }, [code]);

  useEffect(() => {
    setSelectedIndex(null);
    setHasSubmitted(false);
  }, [room?.round?.question?.id, room?.status]);

  if (!room) {
    return (
      <main className="min-h-screen bg-[#97E7F5] p-4 flex items-center justify-center">
        <div className="rounded-3xl bg-white border-4 border-[#01377D] p-6 shadow-xl text-[#01377D] font-bold">
          {statusMessage}
        </div>
      </main>
    );
  }

  const currentPlayer =
    room.players?.find((p: any) => p.id === playerId) ||
    room.players?.find(
      (p: any) => !p.isHost && playerName && p.name === playerName
    ) ||
    null;

  const effectivePlayerId = currentPlayer?.id || playerId;
  const isAnsweringPlayer = room.round?.answeringPlayerId === effectivePlayerId;

  const answeringPlayer = room.players?.find(
    (p: any) => p.id === room.round?.answeringPlayerId
  );

  const winner = room.winner;

  const submitSelection = () => {
    if (selectedIndex === null || hasSubmitted || !room?.round) return;

    setHasSubmitted(true);

    if (isAnsweringPlayer && room.status === "answering") {
      socket.emit("player:submit-answer", {
      code,
      answerIndex: selectedIndex,
      playerName,
    });
    } else if (!isAnsweringPlayer && room.status === "guessing") {
      socket.emit("player:submit-guess", {
      code,
      guessIndex: selectedIndex,
      playerName,
    });
  };

  const timerPercent =
    typeof room.timeLeft === "number"
      ? `${Math.max(0, Math.min(100, (room.timeLeft / 15) * 100))}%`
      : "0%";

  return (
    <main className="min-h-screen bg-[#97E7F5] p-4">
      <div className="max-w-lg mx-auto rounded-[28px] bg-white border-4 border-[#01377D] p-6 shadow-[0_12px_0_#01377D]">
        <div className="flex items-center justify-between mb-4 gap-3">
          <h1 className="text-3xl font-black text-[#01377D]">Mindset</h1>
          <div className="rounded-full bg-[#7ED348] px-4 py-2 font-bold text-[#01377D]">
            {room.code}
          </div>
        </div>

        {currentPlayer && (
          <div className="mb-3 rounded-2xl bg-[#EAFBFE] px-4 py-3 text-[#01377D] font-bold">
            You are: {currentPlayer.name}
          </div>
        )}

        {room.round && (
          <div className="mb-3 rounded-2xl bg-[#EAFBFE] px-4 py-3 text-[#01377D] font-bold">
            Current chooser: {answeringPlayer?.name || "Unknown"}
          </div>
        )}

        {winner && (
          <div className="mb-4 rounded-2xl bg-[#26B170] p-4 text-white font-black">
            {winner.name} wins with 10 points!
          </div>
        )}

        {typeof room.timeLeft === "number" && room.status !== "finished" && (
          <div className="mb-4">
            <div className="mb-1 text-[#01377D] font-bold">⏱ {room.timeLeft}s</div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-[#EAFBFE]">
              <div
                className="h-full bg-[#009DD1] transition-all duration-500"
                style={{ width: timerPercent }}
              />
            </div>
          </div>
        )}

        {!room.round && !winner && (
          <div className="rounded-2xl bg-[#EAFBFE] p-5 text-[#01377D] font-semibold">
            Waiting for the host to start the next round...
          </div>
        )}

        {room.round && (
          <>
            <div className="mb-3 rounded-2xl bg-[#01377D] px-4 py-3 text-white font-bold">
              Phase: {room.status}
              <br />
              {room.status === "answering"
                ? `${room.submittedCount || 0} / 1 answered`
                : `${room.submittedCount || 0} / ${room.totalGuessers || 0} guessed`}
            </div>

            <div className="rounded-2xl bg-[#EAFBFE] p-5 mb-4 border-2 border-[#97E7F5]">
              <p className="text-[#01377D] text-lg font-bold">
                {room.round.question.prompt}
              </p>
            </div>

            {room.status === "answering" && isAnsweringPlayer && (
              <>
                <p className="mb-4 text-[#01377D] font-semibold">
                  It&apos;s your turn. Choose your answer, then press submit.
                </p>

                <div className="grid gap-3 mb-4">
                  {room.round.question.options.map((option: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => !hasSubmitted && setSelectedIndex(index)}
                      disabled={hasSubmitted}
                      className={`rounded-2xl font-bold p-4 text-left shadow-[0_6px_0_#01377D] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${
                        selectedIndex === index
                          ? "bg-[#26B170] text-white"
                          : "bg-[#009DD1] text-white"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <button
                  onClick={submitSelection}
                  disabled={selectedIndex === null || hasSubmitted}
                  className="w-full rounded-2xl bg-[#01377D] px-6 py-4 text-lg font-black text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Answer
                </button>
              </>
            )}

            {room.status === "answering" && !isAnsweringPlayer && (
              <div className="rounded-2xl bg-[#EAFBFE] p-5 text-[#01377D] font-semibold">
                Waiting for {answeringPlayer?.name || "the player"} to answer...
              </div>
            )}

            {room.status === "guessing" && !isAnsweringPlayer && (
              <>
                <p className="mb-4 text-[#01377D] font-semibold">
                  Guess what {answeringPlayer?.name || "this player"} picked, then
                  press submit.
                </p>

                <div className="grid gap-3 mb-4">
                  {room.round.question.options.map((option: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => !hasSubmitted && setSelectedIndex(index)}
                      disabled={hasSubmitted}
                      className={`rounded-2xl font-bold p-4 text-left shadow-[0_6px_0_#01377D] transition disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${
                        selectedIndex === index
                          ? "bg-[#26B170] text-white"
                          : "bg-[#009DD1] text-white"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <button
                  onClick={submitSelection}
                  disabled={selectedIndex === null || hasSubmitted}
                  className="w-full rounded-2xl bg-[#01377D] px-6 py-4 text-lg font-black text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Guess
                </button>
              </>
            )}

            {room.status === "guessing" && isAnsweringPlayer && (
              <div className="rounded-2xl bg-[#EAFBFE] p-5 text-[#01377D] font-semibold">
                Everyone else is guessing your answer...
              </div>
            )}

            {room.status === "results" && room.round.results && (
              <div className="mt-2 space-y-4">
                <div className="rounded-2xl bg-[#7ED348] p-4 text-[#01377D] font-bold">
                  Correct answer:{" "}
                  {room.round.question.options[room.round.results.correctAnswerIndex]}
                </div>

                {room.round.results.guessResults.map((r: any) => (
                  <div
                    key={r.playerId}
                    className={`rounded-2xl p-4 font-bold ${
                      r.wasCorrect
                        ? "bg-[#26B170] text-white"
                        : "bg-[#EAFBFE] text-[#01377D]"
                    }`}
                  >
                    <div className="flex justify-between gap-3">
                      <div>
                        <p>{r.name}</p>
                        <p className="text-sm opacity-80">
                          Guessed:{" "}
                          {typeof r.guessIndex === "number"
                            ? room.round.question.options[r.guessIndex]
                            : "No guess"}
                        </p>
                      </div>
                      <div>{r.wasCorrect ? "+1" : "+0"}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}