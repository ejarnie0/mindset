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

function makeCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function getPublicRoom(room) {
  const winner = room.players.find((p) => p.score >= WIN_SCORE) || null;

  return {
    ...room,
    winner,
    submittedCount: getSubmittedCount(room),
    totalGuessers: getTotalGuessers(room),
  };
}

function pickRandomQuestion() {
  return questions[Math.floor(Math.random() * questions.length)];
}

function pickNextAnsweringPlayer(room) {
  const players = room.players.filter((p) => !p.isHost);
  if (players.length === 0) return null;

  if (typeof room.lastAnsweringIndex !== "number") {
    room.lastAnsweringIndex = -1;
  }

  room.lastAnsweringIndex = (room.lastAnsweringIndex + 1) % players.length;
  return players[room.lastAnsweringIndex];
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

  if (room.status === "guessing" || room.status === "results") {
    return Object.keys(room.round.guesses).length;
  }

  return 0;
}

function clearRoomTimer(room) {
  if (room.timerInterval) clearInterval(room.timerInterval);
  if (room.timerTimeout) clearTimeout(room.timerTimeout);
  room.timerInterval = null;
  room.timerTimeout = null;
  room.timeLeft = null;
}

function startPhaseTimer(room, seconds, onExpire) {
  clearRoomTimer(room);

  room.timeLeft = seconds;
  io.to(room.code).emit("room:update", getPublicRoom(room));

  room.timerInterval = setInterval(() => {
    room.timeLeft -= 1;

    if (room.timeLeft < 0) room.timeLeft = 0;

    io.to(room.code).emit("room:update", getPublicRoom(room));

    if (room.timeLeft <= 0) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }
  }, 1000);

  room.timerTimeout = setTimeout(() => {
    clearRoomTimer(room);
    onExpire();
    io.to(room.code).emit("room:update", getPublicRoom(room));
  }, seconds * 1000);
}

function finishRound(room) {
  if (!room.round) return;

  room.status = "results";
  room.round.revealed = true;

  const correct = room.round.chosenAnswerIndex;

  const nonAnsweringPlayers = room.players.filter(
    (p) => !p.isHost && p.id !== room.round.answeringPlayerId
  );

  const results = nonAnsweringPlayers.map((player) => {
    const guess = room.round.guesses[player.id];
    const wasCorrect = guess === correct;

    if (wasCorrect) {
      player.score += 1;
    }

    return {
      playerId: player.id,
      name: player.name,
      guessIndex: guess,
      wasCorrect,
      pointsGained: wasCorrect ? 1 : 0,
    };
  });

  const fooledCount = nonAnsweringPlayers.filter(
    (p) => room.round.guesses[p.id] !== correct
  ).length;

  const answeringPlayer = room.players.find(
    (p) => p.id === room.round.answeringPlayerId
  );

  if (answeringPlayer) {
    answeringPlayer.score += fooledCount;
  }

  room.round.results = {
    correctAnswerIndex: correct,
    guessResults: results,
    answeringPlayerPoints: fooledCount,
  };

  clearRoomTimer(room);
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
      timerInterval: null,
      timerTimeout: null,
      timeLeft: null,
      lastAnsweringIndex: -1,
    };

    socket.join(code);
    socket.data.roomCode = code;

    callback({ ok: true, code, room: getPublicRoom(rooms[code]) });
    io.to(code).emit("room:update", getPublicRoom(rooms[code]));
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

    socket.join(code);
    socket.data.roomCode = code;

    callback({ ok: true, code, room: getPublicRoom(room), playerId: socket.id });
    io.to(code).emit("room:update", getPublicRoom(room));
  });

  socket.on("room:get-state", ({ code }, callback) => {
    const room = rooms[code];
    if (!room) {
      return callback?.({ ok: false, error: "Room not found" });
    }

    socket.join(code);
    socket.data.roomCode = code;
    callback?.({ ok: true, room: getPublicRoom(room) });
  });

  socket.on("game:start-round", ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    if (room.players.filter((p) => !p.isHost).length < 2) return;
    if (room.players.some((p) => p.score >= WIN_SCORE)) return;

    const answeringPlayer = pickNextAnsweringPlayer(room);
    if (!answeringPlayer) return;

    clearRoomTimer(room);

    room.status = "answering";
    room.round = {
      answeringPlayerId: answeringPlayer.id,
      question: pickRandomQuestion(),
      chosenAnswerIndex: null,
      guesses: {},
      revealed: false,
      results: null,
    };

    io.to(code).emit("room:update", getPublicRoom(room));

    startPhaseTimer(room, 15, () => {
      if (!room.round) return;

      if (room.round.chosenAnswerIndex === null) {
        room.round.chosenAnswerIndex = Math.floor(
          Math.random() * room.round.question.options.length
        );
      }

      room.status = "guessing";
      io.to(code).emit("room:update", getPublicRoom(room));

      startPhaseTimer(room, 15, () => {
        if (!room.round) return;
        finishRound(room);
      });
    });
  });

  socket.on("player:submit-answer", ({ code, answerIndex }) => {
    const room = rooms[code];
    if (!room || !room.round) return;
    if (room.status !== "answering") return;
    if (socket.id !== room.round.answeringPlayerId) return;
    if (room.round.chosenAnswerIndex !== null) return;

    room.round.chosenAnswerIndex = answerIndex;
    room.status = "guessing";

    io.to(code).emit("room:update", getPublicRoom(room));

    startPhaseTimer(room, 15, () => {
      if (!room.round) return;
      finishRound(room);
    });
  });

  socket.on("player:submit-guess", ({ code, guessIndex }) => {
    const room = rooms[code];
    if (!room || !room.round) return;
    if (room.status !== "guessing") return;
    if (socket.id === room.round.answeringPlayerId) return;
    if (room.round.guesses[socket.id] !== undefined) return;

    room.round.guesses[socket.id] = guessIndex;

    const nonAnsweringPlayers = room.players.filter(
      (p) => !p.isHost && p.id !== room.round.answeringPlayerId
    );

    const allGuessed =
      nonAnsweringPlayers.length > 0 &&
      nonAnsweringPlayers.every((p) => room.round.guesses[p.id] !== undefined);

    if (allGuessed) {
      finishRound(room);
    }

    io.to(code).emit("room:update", getPublicRoom(room));
  });

  socket.on("game:next-round", ({ code }) => {
    const room = rooms[code];
    if (!room) return;

    clearRoomTimer(room);
    room.status = "lobby";
    room.round = null;

    io.to(code).emit("room:update", getPublicRoom(room));
  });

  socket.on("disconnect", () => {
    for (const code in rooms) {
      const room = rooms[code];
      room.players = room.players.filter((p) => p.id !== socket.id);

      if (room.players.length === 0) {
        clearRoomTimer(room);
        delete rooms[code];
      } else {
        io.to(code).emit("room:update", getPublicRoom(room));
      }
    }
  });
});

server.listen(3001, "0.0.0.0", () => {
  console.log("Socket server running on port 3001");
});