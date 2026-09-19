import redisClient from "../config/redis.js";
import { emitLeaderboardUpdate, emitPersonalRecord } from "../socket.js";
import {
    createWorkout,
    getWorkoutsByUser,
    updateWorkout,
    deleteWorkout,
    getExerciseById,
    getWorkoutById,
    withWorkoutTransaction,
    refreshPersonalRecords
} from "../repositories/workoutRepository.js";

function exerciseId(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id < 1) throw new Error("Invalid exercise_id");
    return id;
}

async function invalidateAndNotify(ids) {
    const uniqueIds = [...new Set(ids)];
    try {
        await redisClient.del(uniqueIds.map(id => `leaderboard:exercise:${id}`));
    } catch {
        // The database has committed. Reporting a failed write could cause retries
        // and duplicate entries. Existing cache keys expire after their short TTL.
        console.error("Leaderboard cache invalidation failed after workout commit");
    }
    for (const id of uniqueIds) emitLeaderboardUpdate(id);
}

export async function createWorkoutService(userId, data) {
    if (!data.exercise_id) throw new Error("exercise_id is required");
    const id = exerciseId(data.exercise_id);
    const workout = await withWorkoutTransaction(userId, async db => {
        if (!await getExerciseById(id, db)) throw new Error("Invalid exercise_id");
        const saved = await createWorkout(userId, { ...data, exercise_id: id, is_pr: false }, db);
        await refreshPersonalRecords(userId, [id], db);
        return getWorkoutById(saved.id, userId, db);
    });
    await invalidateAndNotify([id]);
    if (workout.is_pr) emitPersonalRecord(userId, workout);
    return workout;
}

export async function getMyWorkoutsService(userId, page = 1, limit = 10) {
    return getWorkoutsByUser(userId, limit, (page - 1) * limit);
}

export async function updateWorkoutService(userId, workoutId, data) {
    const { workout, ids } = await withWorkoutTransaction(userId, async db => {
        const existing = await getWorkoutById(workoutId, userId, db);
        if (!existing) throw new Error("Workout not found or unauthorized");
        const id = data.exercise_id === undefined ? existing.exercise_id : exerciseId(data.exercise_id);
        if (!await getExerciseById(id, db)) throw new Error("Invalid exercise_id");
        await updateWorkout(workoutId, userId, {
            ...data,
            ...(data.exercise_id !== undefined && { exercise_id: id })
        }, db);
        const ids = [...new Set([existing.exercise_id, id])];
        await refreshPersonalRecords(userId, ids, db);
        return { workout: await getWorkoutById(workoutId, userId, db), ids };
    });
    await invalidateAndNotify(ids);
    return workout;
}

export async function deleteWorkoutService(userId, workoutId) {
    const workout = await withWorkoutTransaction(userId, async db => {
        const deleted = await deleteWorkout(workoutId, userId, db);
        await refreshPersonalRecords(userId, [deleted.exercise_id], db);
        return deleted;
    });
    await invalidateAndNotify([workout.exercise_id]);
    return workout;
}
