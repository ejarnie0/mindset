"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { socket } from "../../lib/socket";

export default function JoinPage() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const router = useRouter();

  const joinRoom = () => {
    socket.connect();
    socket.emit("player:join-room", { code: code.toUpperCase(), name }, (res: any) => {
      if (res.ok) {
        localStorage.setItem("playerId", res.playerId);
        router.push(`/room/${code.toUpperCase()}`);
      } else {
        alert(res.error);
      }
    });
  };

  return (
    <main className="min-h-screen bg-[#97E7F5] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-white border-4 border-[#01377D] p-8 shadow-xl">
        <h1 className="text-3xl font-black text-[#01377D] mb-6">Join Game</h1>

        <div className="space-y-4">
          <input
            className="w-full rounded-xl border-2 border-[#01377D] p-3"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-xl border-2 border-[#01377D] p-3 uppercase"
            placeholder="Room code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            onClick={joinRoom}
            className="w-full rounded-2xl bg-[#26B170] text-white font-bold py-4"
          >
            Join
          </button>
        </div>
      </div>
    </main>
  );
}