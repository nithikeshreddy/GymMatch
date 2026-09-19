import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io;

export function initializeSockets(httpServer) {
    io = new Server(httpServer, { cors: { origin: "*" } });
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (typeof token !== "string") throw new Error("Missing token");
            const user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
            if (typeof user.id !== "string" || !Number.isFinite(user.exp)) {
                throw new Error("Invalid token payload");
            }
            socket.data.userId = user.id;
            socket.data.expiresAt = user.exp * 1000;
            next();
        } catch {
            next(new Error("Unauthorized"));
        }
    });

    io.on("connection", socket => {
        const userId = socket.data.userId;
        // Rooms support all authenticated tabs/devices for the same user.
        socket.join(`user:${userId}`);
        const expiry = setTimeout(() => socket.disconnect(true),
            Math.max(0, socket.data.expiresAt - Date.now()));
        expiry.unref();
        socket.on("disconnect", () => clearTimeout(expiry));

        // Keep the existing client event, but never trust its identity payload.
        socket.on("register_user", (requestedId, acknowledge) => {
            const response = requestedId === userId
                ? { ok: true }
                : { error: "Unauthorized" };
            if (typeof acknowledge === "function") acknowledge(response);
        });

        socket.on("join_exercise", (value, acknowledge) => {
            const id = Number(value);
            const valid = Number.isSafeInteger(id) && id > 0;
            if (valid) socket.join(`exercise:${id}`);
            if (typeof acknowledge === "function") {
                acknowledge(valid ? { ok: true } : { error: "Invalid exercise_id" });
            }
        });
    });
    return io;
}

export function emitLeaderboardUpdate(exerciseId) {
    io?.to(`exercise:${exerciseId}`).emit("leaderboard_update", { exercise_id: exerciseId });
}

export function emitPersonalRecord(userId, workout) {
    io?.to(`user:${userId}`).emit("notification", {
        message: `New PR! You Lifted ${workout.weight} kg`,
        exercise_id: workout.exercise_id
    });
}
