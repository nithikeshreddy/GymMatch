import { getLeaderboardService } from "../services/leaderboardService.js";
import redisClient from "../config/redis.js";

export async function getLeaderboardController(req, res) {
    try {
        const { exercise_id } = req.query;

        if (!exercise_id) {
            return res.status(400).json({ error: "exercise_id is required" });
        }

        const cacheKey = `leaderboard:exercise:${exercise_id}`;

        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return res.status(200).json(JSON.parse(cached));
        }

        const leaderboard = await getLeaderboardService(exercise_id);
        const response = { leaderboard };

        await redisClient.setEx(cacheKey, 60, JSON.stringify(response));

        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}