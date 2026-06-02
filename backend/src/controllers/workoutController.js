import {
    createWorkoutService,
    getMyWorkoutsService,
    updateWorkoutService,
    deleteWorkoutService
} from "../services/workoutService.js";

export async function createWorkoutController(req, res) {
    try {
        const userId = req.user.id;
        const data = req.body;

        if (!data.exercise_id) {
            return res.status(400).json({
                error: "exercise_id is required"
            });
        }

        const workout = await createWorkoutService(userId, data);

        return res.status(201).json({
            message: "Workout created successfully",
            workout
        });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}

export async function getMyWorkoutsController(req, res) {
    try {
        const userId = req.user.id;
        //console.log("GET USER:", req.user.id);

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));

        const workouts = await getMyWorkoutsService(userId, page, limit);

        return res.status(200).json({ workouts });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}

export async function updateWorkoutController(req, res) {
    try {
        const userId = req.user.id;
        const workoutId = req.params.id;
        const data = req.body;

        if (!workoutId) {
            return res.status(400).json({ error: "Workout ID is required" });
        }

        const updatedWorkout = await updateWorkoutService(userId, workoutId, data);

        return res.status(200).json({
            message: "Workout updated successfully",
            workout: updatedWorkout
        });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}

export async function deleteWorkoutController(req, res) {
    try {
        const userId = req.user.id;
        const workoutId = req.params.id;

        if (!workoutId) {
            return res.status(400).json({ error: "Workout ID is required" });
        }

        await deleteWorkoutService(userId, workoutId);

        return res.status(200).json({
            message: "Workout deleted successfully"
        });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}