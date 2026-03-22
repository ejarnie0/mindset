const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const questions = require("../data/questions.json");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const rooms = {};

const WIN_SCORE = 10;
const ANSWER_TIME = 15;
const GUESS_TIME = 15;
function makeCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function getNonHostPlayers(room) {
  return room.players.filter((p) => !p.isHost);
}

function pickQuestionForRoom(room) {
  if (!room.usedQuestionIds) room.usedQuestionIds = [];

  const used = new Set(room.usedQuestionIds);
  let pool = questions.filter((q) => !used.has(q.id));

  if (pool.length === 0) {
    room.usedQuestionIds = [];
    pool = questions;
  }

  const q = pool[Math.floor(Math.random() * pool.length)];
  room.usedQuestionIds.push(q.id);
  return q;
}

function getTotalGuessers(room) {
  if (!room.round) return 0;
  return room.players.filter(
    (p) => !p.isHost && p.id !== room.round.answeringPlayerId
  ).length;
}

function getSubmittedCount(room) {
  if (!room.round) return 0;

  if (room.status === "answering") {
    return room.round.chosenAnswerIndex !== null ? 1 : 0;
  }

  if (room.status === "guessing" || room.status === "intermission") {
    return Object.keys(room.round.guesses).length;
  }

  return 0;
}

function getReadyForNextProgress(room) {
  const players = getNonHostPlayers(room);
  const ready = room.nextRoundReady || {};
  const readyCount = players.filter((p) => ready[p.id]).length;
  return { readyCount, readyTotal: players.length };
}

function tryStartNextRoundWhenAllReady(room) {
  const players = getNonHostPlayers(room);
  if (players.length === 0) return;

  const ready = room.nextRoundReady || {};
  if (!players.every((p) => ready[p.id])) return;

  clearRoomTimer(room);
  room.nextRoundReady = {};
  startNextRound(room);
}

function getWinner(room) {
  return room.players.find((p) => p.score >= WIN_SCORE) || null;
}

function getPublicRoom(room) {
  const { timerInterval, timerTimeout, usedQuestionIds, ...serializable } = room;
  const { readyCount, readyTotal } = getReadyForNextProgress(room);
  return {
    ...serializable,
    winner: getWinner(room),
    submittedCount: getSubmittedCount(room),
    totalGuessers: getTotalGuessers(room),
    readyCount,
    readyTotal,
  };
}

function emitRoom(room) {
  io.to(room.code).emit("room:update", getPublicRoom(room));
}

function clearRoomTimer(room) {
  if (room.timerInterval) clearInterval(room.timerInterval);
  if (room.timerTimeout) clearTimeout(room.timerTimeout);
  room.timerInterval = null;
  room.timerTimeout = null;
  room.timeLeft = null;
}

function startCountdown(room, seconds, onExpire) {
  clearRoomTimer(room);

  room.timeLeft = seconds;
  emitRoom(room);

  room.timerInterval = setInterval(() => {
    room.timeLeft -= 1;
    if (room.timeLeft < 0) room.timeLeft = 0;
    emitRoom(room);

    if (room.timeLeft <= 0) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }
  }, 1000);

  room.timerTimeout = setTimeout(() => {
    clearRoomTimer(room);
    onExpire();
  }, seconds * 1000);
}

function resetAnswerOrder(room) {
  const players = getNonHostPlayers(room);
  room.answerOrder = players.map((p) => p.id);

  if (room.answerOrder.length > 1) {
    const startIndex = Math.floor(Math.random() * room.answerOrder.length);
    room.answerOrder = [
      ...room.answerOrder.slice(startIndex),
      ...room.answerOrder.slice(0, startIndex),
    ];
  }

  room.answerTurnIndex = 0;
}

function ensureAnswerOrder(room) {
  const players = getNonHostPlayers(room);
  const currentIds = players.map((p) => p.id).sort().join(",");
  const orderIds = [...(room.answerOrder || [])].sort().join(",");

  if (
    !room.answerOrder ||
    room.answerOrder.length !== players.length ||
    currentIds !== orderIds
  ) {
    resetAnswerOrder(room);
  }
}

function pickNextAnsweringPlayer(room) {
  const players = getNonHostPlayers(room);
  if (players.length < 2) return null;

  ensureAnswerOrder(room);

  const playerId = room.answerOrder[room.answerTurnIndex];
  const player = room.players.find((p) => p.id === playerId && !p.isHost);

  room.answerTurnIndex = (room.answerTurnIndex + 1) % room.answerOrder.length;

  return player || players[0];
}

function rebindPlayerSocket(room, oldId, newId) {
  if (oldId === newId) return;

  const player = room.players.find((p) => p.id === oldId);
  if (player) player.id = newId;

  if (room.hostId === oldId) room.hostId = newId;

  if (room.answerOrder) {
    room.answerOrder = room.answerOrder.map((id) => (id === oldId ? newId : id));
  }

  if (room.round) {
    if (room.round.answeringPlayerId === oldId) {
      room.round.answeringPlayerId = newId;
    }

    if (room.round.guesses[oldId] !== undefined) {
      room.round.guesses[newId] = room.round.guesses[oldId];
      delete room.round.guesses[oldId];
    }

    if (room.round.results?.guessResults) {
      room.round.results.guessResults = room.round.results.guessResults.map((r) =>
        r.playerId === oldId ? { ...r, playerId: newId } : r
      );
    }
  }

  if (room.nextRoundReady && room.nextRoundReady[oldId]) {
    room.nextRoundReady[newId] = true;
    delete room.nextRoundReady[oldId];
  }
}

function ensurePlayerBound(room, socket, playerId, playerName) {
  let player = room.players.find((p) => p.id === socket.id);
  if (player) return player;

  if (playerId) {
    const byOldId = room.players.find((p) => !p.isHost && p.id === playerId);
    if (byOldId) {
      rebindPlayerSocket(room, byOldId.id, socket.id);
      return byOldId;
    }
  }

  if (playerName) {
    const byName = room.players.find((p) => !p.isHost && p.name === playerName);
    if (byName) {
      rebindPlayerSocket(room, byName.id, socket.id);
      return byName;
    }
  }

  return null;
}

function moveToGuessing(room) {
  if (!room.round) return;

  room.status = "guessing";
  emitRoom(room);

  startCountdown(room, GUESS_TIME, () => {
    if (!room.round) return;
    finishRound(room);
  });
}

function startNextRound(room) {
  room.nextRoundReady = {};

  if (getWinner(room)) {
    room.status = "finished";
    room.round = null;
    room.timeLeft = null;
    emitRoom(room);
    return;
  }

  const answeringPlayer = pickNextAnsweringPlayer(room);
  if (!answeringPlayer) {
    room.status = "lobby";
    room.round = null;
    room.timeLeft = null;
    emitRoom(room);
    return;
  }

  room.status = "answering";
  room.roundCounter = (room.roundCounter || 0) + 1;
  room.round = {
    roundId: room.roundCounter,
    answeringPlayerId: answeringPlayer.id,
    question: pickQuestionForRoom(room),
    chosenAnswerIndex: null,
    guesses: {},
    revealed: false,
    results: null,
  };

  emitRoom(room);

  startCountdown(room, ANSWER_TIME, () => {
    if (!room.round) return;

    if (room.round.chosenAnswerIndex === null) {
      room.round.chosenAnswerIndex = Math.floor(
        Math.random() * room.round.question.options.length
      );
    }

    moveToGuessing(room);
  });
}

function finishRound(room) {
  if (!room.round) return;
  if (room.round.revealed) return;

  clearRoomTimer(room);
  room.round.revealed = true;

  const correct = room.round.chosenAnswerIndex;

  const guessers = room.players.filter(
    (p) => !p.isHost && p.id !== room.round.answeringPlayerId
  );

  const guessResults = guessers.map((player) => {
    const guessIndex = room.round.guesses[player.id];
    const wasCorrect = guessIndex === correct;

    if (wasCorrect) player.score += 1;

    return {
      playerId: player.id,
      name: player.name,
      guessIndex,
      wasCorrect,
      pointsGained: wasCorrect ? 1 : 0,
    };
  });

  const answeringPlayerPoints = guessResults.filter((r) => !r.wasCorrect).length;

  const answeringPlayer = room.players.find(
    (p) => p.id === room.round.answeringPlayerId && !p.isHost
  );
  if (answeringPlayer && answeringPlayerPoints > 0) {
    answeringPlayer.score += answeringPlayerPoints;
  }

  room.round.results = {
    correctAnswerIndex: correct,
    guessResults,
    answeringPlayerPoints,
  };

  if (getWinner(room)) {
    room.status = "finished";
    room.round = null;
    room.nextRoundReady = {};
    emitRoom(room);
    return;
  }

  room.status = "intermission";
  room.nextRoundReady = {};
  emitRoom(room);
}

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.on("host:create-room", ({ hostName }, callback) => {
    const code = makeCode();

    rooms[code] = {
      code,
      hostId: socket.id,
      players: [
        {
          id: socket.id,
          name: hostName || "Host",
          score: 0,
          isHost: true,
        },
      ],
      status: "lobby",
      round: null,
      timeLeft: null,
      timerInterval: null,
      timerTimeout: null,
      answerOrder: [],
      answerTurnIndex: 0,
      nextRoundReady: {},
      usedQuestionIds: [],
    };

    socket.join(code);
    socket.data.roomCode = code;

    callback({ ok: true, code, room: getPublicRoom(rooms[code]) });
    emitRoom(rooms[code]);
  });

  socket.on("player:join-room", ({ code, name }, callback) => {
    const room = rooms[code];
    if (!room) return callback({ ok: false, error: "Room not found" });

    room.players.push({
      id: socket.id,
      name,
      score: 0,
      isHost: false,
    });

    resetAnswerOrder(room);

    socket.join(code);
    socket.data.roomCode = code;

    callback({ ok: true, code, room: getPublicRoom(room), playerId: socket.id });
    emitRoom(room);
  });

  socket.on("room:get-state", ({ code, playerId, playerName }, callback) => {
    const room = rooms[code];
    if (!room) return callback?.({ ok: false, error: "Room not found" });

    socket.join(code);
    socket.data.roomCode = code;

    const player = ensurePlayerBound(room, socket, playerId, playerName);

    callback?.({
      ok: true,
      room: getPublicRoom(room),
      playerId: player?.id || null,
    });

    emitRoom(room);
  });

  socket.on("game:start-round", ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    if (room.status !== "lobby") return;
    if (getNonHostPlayers(room).length < 2) return;
    if (getWinner(room)) return;

    startNextRound(room);
  });

  socket.on("player:submit-answer", ({ code, answerIndex, playerId, playerName }, callback) => {
    const room = rooms[code];
    if (!room || !room.round) return callback?.({ ok: false, reason: "no-room-or-round" });
    if (room.status !== "answering") return callback?.({ ok: false, reason: "wrong-phase" });

    const player = ensurePlayerBound(room, socket, playerId, playerName);
    if (!player) return callback?.({ ok: false, reason: "player-not-found" });
    if (player.id !== room.round.answeringPlayerId) {
      return callback?.({ ok: false, reason: "not-answering-player" });
    }
    if (room.round.chosenAnswerIndex !== null) {
      return callback?.({ ok: false, reason: "already-answered" });
    }

    room.round.chosenAnswerIndex = answerIndex;
    callback?.({ ok: true });
    moveToGuessing(room);
  });

  socket.on("player:ready-next-round", ({ code, playerId, playerName }, callback) => {
    const room = rooms[code];
    if (!room) return callback?.({ ok: false, reason: "no-room" });
    if (room.status !== "intermission") {
      return callback?.({ ok: false, reason: "wrong-phase" });
    }

    const player = ensurePlayerBound(room, socket, playerId, playerName);
    if (!player || player.isHost) {
      return callback?.({ ok: false, reason: "invalid-player" });
    }

    if (!room.nextRoundReady) room.nextRoundReady = {};
    room.nextRoundReady[player.id] = true;
    callback?.({ ok: true });
    emitRoom(room);
    tryStartNextRoundWhenAllReady(room);
  });

  socket.on("player:submit-guess", ({ code, guessIndex, playerId, playerName }, callback) => {
    const room = rooms[code];
    if (!room || !room.round) return callback?.({ ok: false, reason: "no-room-or-round" });
    if (room.status !== "guessing") return callback?.({ ok: false, reason: "wrong-phase" });

    const player = ensurePlayerBound(room, socket, playerId, playerName);
    if (!player) return callback?.({ ok: false, reason: "player-not-found" });
    if (player.id === room.round.answeringPlayerId) {
      return callback?.({ ok: false, reason: "answering-player-cannot-guess" });
    }
    if (room.round.guesses[player.id] !== undefined) {
      return callback?.({ ok: false, reason: "already-guessed" });
    }

    room.round.guesses[player.id] = guessIndex;
    callback?.({ ok: true });

    const guessers = room.players.filter(
      (p) => !p.isHost && p.id !== room.round.answeringPlayerId
    );

    const allGuessed =
      guessers.length > 0 &&
      guessers.every((p) => room.round.guesses[p.id] !== undefined);

    if (allGuessed) {
      finishRound(room);
      return;
    }

    emitRoom(room);
  });

  socket.on("game:next-round", ({ code }) => {
    const room = rooms[code];
    if (!room) return;

    clearRoomTimer(room);
    room.nextRoundReady = {};

    if (getWinner(room)) {
      room.round = null;
      room.status = "finished";
      emitRoom(room);
      return;
    }

    startNextRound(room);
  });

  socket.on("disconnect", () => {
    for (const code in rooms) {
      const room = rooms[code];
      room.players = room.players.filter((p) => p.id !== socket.id);

      if (room.players.length === 0) {
        clearRoomTimer(room);
        delete rooms[code];
      } else {
        resetAnswerOrder(room);

        if (room.round && room.round.answeringPlayerId === socket.id) {
          clearRoomTimer(room);
          room.round = null;
          room.status = "lobby";
          room.nextRoundReady = {};
        }

        emitRoom(room);
      }
    }
  });
});

const PORT = Number(process.env.PORT) || 3001;

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Socket server listening on port ${PORT}`);
});