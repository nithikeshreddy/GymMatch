import redisClient from "../config/redis.js";
import { io, userSocketMap } from "../server.js";


import {
    createWorkout as createWorkoutRepo,
    getMaxWeight,
    getWorkoutsByUser,
    updateWorkout,
    deleteWorkout,
    getExerciseById,
    getWorkoutById
} from "../repositories/workoutRepository.js";

export async function createWorkoutService(userId, data) {
    if (!data.exercise_id) {
        throw new Error("exercise_id is required");
    }

    let is_pr = false;

    const exercise = await getExerciseById(data.exercise_id);

    if (!exercise) {
        throw new Error("Invalid exercise_id");
    }

    if (exercise.type === "strength" && data.weight != null) {
        const maxWeight = await getMaxWeight(userId, data.exercise_id);

        if (maxWeight === null || data.weight > maxWeight) {
            is_pr = true;

            const socketId = userSocketMap.get(userId);

            if(socketId) {
                io.to(socketId).emit("notification", {
                    message: `New PR! You Lifted ${data.weight} kg`,
                    exercise_id: data.exercise_id
                });
            }
        }
    }

    const workoutData = {
        ...data,
        is_pr
    };

    const workout = await createWorkoutRepo(userId, workoutData);

    await redisClient.del(`leaderboard:exercise:${data.exercise_id}`);

    io.to(`exercise:${data.exercise_id}`).emit("leaderboard_update", {
        exercise_id: data.exercise_id
    })
    return workout;
}

export async function getMyWorkoutsService(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    return await getWorkoutsByUser(userId, limit, offset);
}

export async function updateWorkoutService(userId, workoutId, data) {

    const existingWorkout = await getWorkoutById(workoutId);

    if (!existingWorkout) {
        throw new Error("Workout not found");
    }

    const exerciseId = data.exercise_id || existingWorkout.exercise_id;

    let is_pr;

    if (data.weight !== undefined || data.exercise_id !== undefined) {

        const exercise = await getExerciseById(exerciseId);

        if (!exercise) {
            throw new Error("Invalid exercise_id");
        }

        if (exercise.type === "strength" && data.weight != null) {

            const maxWeight = await getMaxWeight(userId, exerciseId);

            if (maxWeight === null || data.weight > maxWeight) {
                is_pr = true;
            } else {
                is_pr = false;
            }
        } else {
            is_pr = false;
        }
    }

    const updatedWorkout = await updateWorkout(
        workoutId,
        userId,
        {
            ...data,
            ...(is_pr !== undefined && { is_pr })
        }
    );

    await redisClient.del(`leaderboard:exercise:${exerciseId}`);

    io.to(`exercise:${exerciseId}`).emit("leaderboard_update", {
        exercise_id: exerciseId
    })

    return updatedWorkout;
}

export async function deleteWorkoutService(userId, workoutId) {
    const existingWorkout = await getWorkoutById(workoutId);

    if (!existingWorkout) {
        throw new Error("Workout not found");
    }

    const deletedWorkout = await deleteWorkout(workoutId, userId);

    await redisClient.del(`leaderboard:exercise:${existingWorkout.exercise_id}`);

    io.to(`exercise:${existingWorkout.exercise_id}`).emit("leaderboard_update", {
        exercise_id: existingWorkout.exercise_id
    })

    return deletedWorkout;
}