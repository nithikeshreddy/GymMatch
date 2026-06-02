import {createWorkoutController, getMyWorkoutsController, updateWorkoutController, deleteWorkoutController} from "../controllers/workoutController.js";

import express from "express";
import {authenticate} from "../middlewares/authMiddleware.js";


const router = express.Router();

router.post("/", authenticate, createWorkoutController);
router.get("/", authenticate, getMyWorkoutsController);

router.put("/:id", authenticate, updateWorkoutController);
router.delete("/:id", authenticate, deleteWorkoutController);

export default router;




