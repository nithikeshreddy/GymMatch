import pool from "../config/db.js";

export async function createWorkout(userId, data, db = pool) {
    const {
        exercise_id,
        weight,
        reps,
        sets,
        duration_minutes,
        rest_time,
        notes,
        workout_date,
        is_pr
    } = data;

    const result = await db.query(
        `INSERT INTO workout_logs
        (user_id, exercise_id, weight, reps, sets, duration_minutes, rest_time, notes, workout_date, is_pr, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::date, CURRENT_DATE),$10,clock_timestamp())
        RETURNING *`,
        [
            userId,
            exercise_id,
            weight,
            reps,
            sets,
            duration_minutes,
            rest_time,
            notes,
            workout_date,
            is_pr
        ]
    );

    return result.rows[0];
}

export async function getWorkoutsByUser(userId, limit, offset) {
    const result = await pool.query(
        `SELECT
            w.id,
            w.user_id,
            w.exercise_id,
            w.weight,
            w.reps,
            w.sets,
            w.duration_minutes,
            w.rest_time,
            w.notes,
            w.workout_date,
            w.is_pr,
            w.created_at,
            w.updated_at,
            e.name AS exercise_name,
            e.type AS exercise_type
        FROM workout_logs w
        JOIN exercises e ON w.exercise_id = e.id
        WHERE w.user_id = $1
        ORDER BY w.workout_date DESC
        LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
    );

    return result.rows;
}

export async function getExerciseById(exerciseId, db = pool) {
    const result = await db.query(
        `SELECT * FROM exercises WHERE id = $1`,
        [exerciseId]
    );

    return result.rows[0];
}

export async function getWorkoutById(workoutId, userId, db = pool) {
    const result = await db.query(
        `SELECT * FROM workout_logs WHERE id = $1 AND user_id = $2`,
        [workoutId, userId]
    );

    return result.rows[0];
}

export async function updateWorkout(workoutId, userId, data, db = pool) {
    const updates = [];
    const values = [workoutId, userId];
    let paramCount = 3;

    if (data.exercise_id !== undefined) {
        updates.push(`exercise_id = $${paramCount++}`);
        values.push(data.exercise_id);
    }

    if (data.weight !== undefined) {
        updates.push(`weight = $${paramCount++}`);
        values.push(data.weight);
    }

    if (data.reps !== undefined) {
        updates.push(`reps = $${paramCount++}`);
        values.push(data.reps);
    }

    if (data.sets !== undefined) {
        updates.push(`sets = $${paramCount++}`);
        values.push(data.sets);
    }

    if (data.duration_minutes !== undefined) {
        updates.push(`duration_minutes = $${paramCount++}`);
        values.push(data.duration_minutes);
    }

    if (data.rest_time !== undefined) {
        updates.push(`rest_time = $${paramCount++}`);
        values.push(data.rest_time);
    }

    if (data.notes !== undefined) {
        updates.push(`notes = $${paramCount++}`);
        values.push(data.notes);
    }

    if (data.workout_date !== undefined) {
        updates.push(`workout_date = $${paramCount++}`);
        values.push(data.workout_date);
    }

    if (updates.length === 0) {
        throw new Error("No fields to update");
    }

    updates.push(`updated_at = NOW()`);

    const query = `
        UPDATE workout_logs
        SET ${updates.join(", ")}
        WHERE id = $1 AND user_id = $2
        RETURNING *
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
        throw new Error("Workout not found or unauthorized");
    }

    return result.rows[0];
}

export async function deleteWorkout(workoutId, userId, db = pool) {
    const result = await db.query(
        `DELETE FROM workout_logs
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [workoutId, userId]
    );

    if (result.rows.length === 0) {
        throw new Error("Workout not found or unauthorized");
    }

    return result.rows[0];
}

// Serialize a user's writes before deriving PRs from their saved history.
export async function withWorkoutTransaction(userId, operation) {
    const db = await pool.connect();
    try {
        await db.query("BEGIN");
        const user = await db.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);
        if (!user.rowCount) throw new Error("User not found");
        const result = await operation(db);
        await db.query("COMMIT");
        return result;
    } catch (error) {
        await db.query("ROLLBACK");
        throw error;
    } finally {
        db.release();
    }
}

export async function refreshPersonalRecords(userId, exerciseIds, db) {
    await db.query(
        `WITH history AS (
            SELECT w.id, w.weight, e.type,
                MAX(w.weight) OVER (
                    PARTITION BY w.exercise_id
                    ORDER BY w.created_at, w.id
                    ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
                ) AS previous_max
            FROM workout_logs w
            JOIN exercises e ON e.id = w.exercise_id
            WHERE w.user_id = $1 AND w.exercise_id = ANY($2::int[])
        )
        UPDATE workout_logs w
        SET is_pr = (h.type = 'strength' AND h.weight IS NOT NULL
                     AND (h.previous_max IS NULL OR h.weight > h.previous_max))
        FROM history h WHERE w.id = h.id`,
        [userId, exerciseIds]
    );
}
