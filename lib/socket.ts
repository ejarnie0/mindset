"use client";

import { io } from "socket.io-client";

const socketUrl =
  typeof window !== "undefined"
    ? `http://${window.location.hostname}:3001`
    : "http://localhost:3001";

export const socket = io(socketUrl, {
  autoConnect: false,
});