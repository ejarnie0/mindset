export type Player = {
  id: string;
  name: string;
  score: number;
  isHost?: boolean;
};

export type Question = {
  id: number;
  prompt: string;
  options: string[];
};

export type Round = {
  answeringPlayerId: string;
  question: Question | null;
  chosenAnswerIndex: number | null;
  guesses: Record<string, number>;
  revealed: boolean;
};

export type Room = {
  code: string;
  hostId: string;
  players: Player[];
  status: "lobby" | "answering" | "guessing" | "results";
  round: Round | null;
};