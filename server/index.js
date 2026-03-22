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

function makeCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function getPublicRoom(room) {
  return room;
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

function pickRandomQuestion() {
  return questions[Math.floor(Math.random() * questions.length)];
}

function pickNextAnsweringPlayer(room) {
  const players = room.players.filter((p) => !p.isHost);
  if (players.length === 0) return null;
  return players[Math.floor(Math.random() * players.length)];
}

function finishRound(room) {
  if (!room.round) return;

  room.status = "results";
  room.round.revealed = true;

  const correct = room.round.chosenAnswerIndex;

  const nonAnsweringPlayers = room.players.filter(
    (p) => !p.isHost && p.id !== room.round.answeringPlayerId
  );

  for (const player of room.players) {
    if (player.id === room.round.answeringPlayerId) continue;
    if (player.isHost) continue;

    if (room.round.guesses[player.id] === correct) {
      player.score += 1;
    }
  }

  const fooledCount = nonAnsweringPlayers.filter(
    (p) => room.round.guesses[p.id] !== correct
  ).length;

  const answeringPlayer = room.players.find(
    (p) => p.id === room.round.answeringPlayerId
  );

  if (answeringPlayer) {
    answeringPlayer.score += fooledCount;
  }

  clearRoomTimer(room);
}

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

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
    };

    socket.join(code);
    socket.data.roomCode = code;

    callback({ ok: true, code, room: getPublicRoom(rooms[code]) });
    io.to(code).emit("room:update", getPublicRoom(rooms[code]));
  });

  socket.on("player:join-room", ({ code, name }, callback) => {
    const room = rooms[code];
    if (!room) return callback({ ok: false, error: "Room not found" });

    const existingPlayer = room.players.find((p) => p.id === socket.id);
    if (!existingPlayer) {
      room.players.push({
        id: socket.id,
        name,
        score: 0,
        isHost: false,
      });
    }

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
    callback?.({ ok: true, room: getPublicRoom(room) });
  });

  socket.on("game:start-round", ({ code }) => {
    const room = rooms[code];
    if (!room) return;

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

      startPhaseTimer(room, 20, () => {
        if (!room.round) return;
        finishRound(room);
      });
    });
  });

  socket.on("player:submit-answer", ({ code, answerIndex }) => {
    const room = rooms[code];
    if (!room || !room.round) return;
    if (socket.id !== room.round.answeringPlayerId) return;
    if (room.round.chosenAnswerIndex !== null) return;

    room.round.chosenAnswerIndex = answerIndex;
    room.status = "guessing";

    startPhaseTimer(room, 20, () => {
      if (!room.round) return;
      finishRound(room);
    });

    io.to(code).emit("room:update", getPublicRoom(room));
  });

  socket.on("player:submit-guess", ({ code, guessIndex }) => {
    const room = rooms[code];
    if (!room || !room.round) return;
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
    console.log("A user disconnected:", socket.id);

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