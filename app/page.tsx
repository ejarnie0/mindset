import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#97E7F5] flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-xl p-8 text-center border-4 border-[#01377D]">
        <h1 className="text-5xl font-black text-[#01377D] mb-4">Mindset</h1>
        <p className="text-[#01377D] mb-8 text-lg">
          Guess how your friends think.
        </p>

        <div className="flex flex-col gap-4">
          <Link
            href="/host"
            className="rounded-2xl bg-[#009DD1] text-white font-bold px-6 py-4 text-xl"
          >
            Host Game
          </Link>
          <Link
            href="/join"
            className="rounded-2xl bg-[#26B170] text-white font-bold px-6 py-4 text-xl"
          >
            Join Game
          </Link>
        </div>
      </div>
    </main>
  );
}