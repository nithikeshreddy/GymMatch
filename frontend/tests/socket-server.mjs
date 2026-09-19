// Test-only Socket.IO fixture. The app never imports this server.
import { createServer } from "node:http";
import { Server } from "socket.io";

const http = createServer(async (req, res) => {
  if (req.url === "/emit" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += chunk;
    const { event, payload, room } = JSON.parse(body);
    if (room) io.to(room).emit(event, payload);
    else io.emit(event, payload);
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok" }));
});
const io = new Server(http, { cors: { origin: "*" } });
// Match the HTTP fixture's login token, so browser tests catch a missing
// auth handshake. Real JWT verification is tested against the backend.
io.use((socket, next) => {
  if (socket.handshake.auth?.token === "test-token") next();
  else next(new Error("Unauthorized"));
});
io.on("connection", (socket) => {
  socket.on("register_user", (id) => socket.join(`user:${id}`));
  socket.on("join_exercise", (id) => socket.join(`exercise:${id}`));
});
http.listen(3101, "127.0.0.1");
