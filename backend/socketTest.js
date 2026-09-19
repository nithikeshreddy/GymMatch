

import "dotenv/config";
import { io } from "socket.io-client";

// Manual diagnostic client; this is not an automated test.
const [userId, exerciseIdArgument] = process.argv.slice(2);
const exerciseId = Number(exerciseIdArgument);

if (!process.env.SOCKET_TEST_TOKEN || !userId || !Number.isInteger(exerciseId) || exerciseId < 1) {
    console.error("Set SOCKET_TEST_TOKEN locally, then run: node socketTest.js <user-id> <exercise-id>");
    process.exit(1);
}

const socket = io("http://localhost:3000", { auth: { token: process.env.SOCKET_TEST_TOKEN } });

socket.on("connect_error", () => {
    console.error("Socket connection failed; verify the API and login token");
    socket.disconnect();
    process.exitCode = 1;
});

socket.on("connect", () => {
    console.log("Connected to server:", socket.id);
    socket.emit("register_user", userId);
    socket.emit("join_exercise", exerciseId);
});

socket.on("notification", (data) => {
    console.log("Notification:", data);
})

socket.on("leaderboard_update", (data) => {
    console.log("Leaderboard updated:", data);
});

socket.on("disconnect", () => {
    console.log("Disconnected");
});
