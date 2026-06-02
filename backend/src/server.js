import "dotenv/config";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app.js";

const userSocketMap = new Map();

if(!process.env.JWT_SECRET) {
    throw new Error("JWT SECRET environment variable is required");
}

const PORT = process.env.PORT || 3000;

const httpServer = createServer(app);

export const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
});


io.on("connection", (socket)=>{
    console.log("Socket Connected:", socket.id);

    socket.on("register_user", (userId) => {
        userSocketMap.set(userId, socket.id);
        console.log(`User ${userId} mapped to Socket ${socket.id}`);
    });

    socket.on("join_exercise", (exerciseId) => {
        const room = `exercise:${exerciseId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined ${room}`);
    });

    socket.on("disconnect", ()=>{
        
        for(let [userId, sockId] of userSocketMap.entries()) {
            if(sockId === socket.id) {
                userSocketMap.delete(userId);
                break;
            }
        }

        console.log("Socket Disconnected:", socket.id);
    })
});


httpServer.listen(PORT, ()=>{
    console.log(`Server running on port ${PORT}`);
});


export {userSocketMap};

