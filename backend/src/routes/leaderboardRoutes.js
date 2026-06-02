import {getLeaderboardController} from "../controllers/leaderboardController.js";

import express from "express";
import { authenticate } from "../middlewares/authMiddleware.js";

const router = express.Router();


router.get("/", authenticate, getLeaderboardController);

export default router;