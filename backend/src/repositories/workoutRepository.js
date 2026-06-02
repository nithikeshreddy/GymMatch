import pool from "../config/db.js";

export async function createWorkout(userId, data) {
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

    const result = await pool.query(
        `INSERT INTO workout_logs
        (user_id, exercise_id, weight, reps, sets, duration_minutes, rest_time, notes, workout_date, is_pr)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
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

export async function getMaxWeight(userId, exerciseId) {
    const result = await pool.query(
        `SELECT MAX(weight) AS max_weight
         FROM workout_logs
         WHERE user_id = $1 AND exercise_id = $2`,
        [userId, exerciseId]
    );

    return result.rows[0]?.max_weight ?? null;
}

export async function getExerciseById(exerciseId) {
    const result = await pool.query(
        `SELECT * FROM exercises WHERE id = $1`,
        [exerciseId]
    );

    return result.rows[0];
}

export async function getWorkoutById(workoutId) {
    const result = await pool.query(
        `SELECT * FROM workout_logs WHERE id = $1`,
        [workoutId]
    );

    return result.rows[0];
}

export async function updateWorkout(workoutId, userId, data) {
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

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        throw new Error("Workout not found or unauthorized");
    }

    return result.rows[0];
}

export async function deleteWorkout(workoutId, userId) {
    const result = await pool.query(
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