import pool from "../config/db.js";


export async function createUser(email, passwordHash) {
    const result = await pool.query(`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING *`, [email, passwordHash]);
    return result.rows[0];
};

export async function findUserByEmail(email) {
    const result = await pool.query(`SELECT * FROM users where email = $1`, [email]);
    return result.rows[0];
};



