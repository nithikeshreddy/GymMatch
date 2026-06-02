import pool from "../config/db.js";

export async function createProfile(userId, data) {
    const {
        name,
        age,
        gender,
        location_city,
        gym_name,
        fitness_goal,
        experience_level,
        preferred_time_slot,
        workout_preference
    } = data;

    const result = await pool.query(
        `INSERT INTO profiles 
        (user_id, name, age, gender, location_city, gym_name, fitness_goal, experience_level, preferred_time_slot, workout_preference)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *`,
        [
            userId,
            name,
            age,
            gender,
            location_city,
            gym_name,
            fitness_goal,
            experience_level,
            preferred_time_slot,
            workout_preference
        ]
    );

    return result.rows[0];
}

export async function getProfileByUserId(userId) {
    const result = await pool.query(
        `SELECT * FROM profiles WHERE user_id = $1`,
        [userId]
    );

    return result.rows[0];
}

export async function updateProfile(userId, data) {
    const updates = [];
    const values = [userId];
    let paramCount = 2;

    if (data.name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(data.name);
    }

    if (data.age !== undefined) {
        updates.push(`age = $${paramCount++}`);
        values.push(data.age);
    }

    if (data.gender !== undefined) {
        updates.push(`gender = $${paramCount++}`);
        values.push(data.gender);
    }

    if (data.location_city !== undefined) {
        updates.push(`location_city = $${paramCount++}`);
        values.push(data.location_city);
    }

    if (data.gym_name !== undefined) {
        updates.push(`gym_name = $${paramCount++}`);
        values.push(data.gym_name);
    }

    if (data.fitness_goal !== undefined) {
        updates.push(`fitness_goal = $${paramCount++}`);
        values.push(data.fitness_goal);
    }

    if (data.experience_level !== undefined) {
        updates.push(`experience_level = $${paramCount++}`);
        values.push(data.experience_level);
    }

    if (data.preferred_time_slot !== undefined) {
        updates.push(`preferred_time_slot = $${paramCount++}`);
        values.push(data.preferred_time_slot);
    }

    if (data.workout_preference !== undefined) {
        updates.push(`workout_preference = $${paramCount++}`);
        values.push(data.workout_preference);
    }

    if (updates.length === 0) {
        throw new Error("No fields to update");
    }

    updates.push(`updated_at = NOW()`);

    const query = `
        UPDATE profiles
        SET ${updates.join(", ")}
        WHERE user_id = $1
        RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        throw new Error("Profile not found");
    }

    return result.rows[0];
}