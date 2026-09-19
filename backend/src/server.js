import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";
import { initializeSockets } from "./socket.js";

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is required");
}

const httpServer = createServer(app);
initializeSockets(httpServer);

httpServer.listen(process.env.PORT || 3000, () => {
    console.log(`Server running on port ${httpServer.address().port}`);
});
