import express from "express";
import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import workoutRoutes from "./routes/workoutRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";

import cors from "cors";


const app = express();
app.use(cors());

app.use(express.json());

app.get("/api/health", (req,res)=>{
    res.json({status: "ok"});
});

app.use("/api/auth", authRoutes);

app.use("/api/profile", profileRoutes);
app.use("/api/workouts", workoutRoutes);
app.use("/api/leaderboard", leaderboardRoutes);


export default app;