

import { io } from "socket.io-client";

const socket = io("http://localhost:3000");

const USER_ID = "1d76458e-8356-4e4a-a2ac-0ba68587ed2e";

socket.on("connect", () => {
    console.log("Connected to server:", socket.id);
    socket.emit("register_user", USER_ID);
    socket.emit("join_exercise", 2);
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

