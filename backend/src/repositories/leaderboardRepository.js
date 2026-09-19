import pool from "../config/db.js";

export async function getLeaderboardByExercise(exerciseId) {
    const result = await pool.query(
        `SELECT 
    p.user_id,
    p.name,
    p.location_city,
    e.name AS exercise_name,
    MAX(w.weight) AS max_weight
FROM workout_logs w
JOIN profiles p ON w.user_id = p.user_id
JOIN exercises e ON w.exercise_id = e.id
WHERE w.exercise_id = $1
GROUP BY p.user_id, p.name, p.location_city, e.id, e.name
ORDER BY max_weight DESC, p.user_id ASC
LIMIT 10`,
        [exerciseId]
    );

    return result.rows;
}
