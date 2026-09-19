import { getLeaderboardService } from "../services/leaderboardService.js";
import redisClient from "../config/redis.js";

export async function getLeaderboardController(req, res) {
    try {
        const exercise_id = Number(req.query.exercise_id);

        if (!Number.isSafeInteger(exercise_id) || exercise_id < 1) {
            return res.status(400).json({ error: "A positive integer exercise_id is required" });
        }

        const cacheKey = `leaderboard:exercise:${exercise_id}`;

        try {
            const cached = await redisClient.get(cacheKey);
            if (cached) return res.status(200).json(JSON.parse(cached));
        } catch {
            console.error("Leaderboard cache read failed; querying PostgreSQL");
        }

        const leaderboard = await getLeaderboardService(exercise_id);
        const response = { leaderboard };

        try {
            await redisClient.setEx(cacheKey, 60, JSON.stringify(response));
        } catch {
            console.error("Leaderboard cache write failed");
        }

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
