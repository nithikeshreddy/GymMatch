import {createProfileController, updateProfileController, getMyProfileController, getProfileByUserIdController} from "../controllers/profileController.js";

import {authenticate} from "../middlewares/authMiddleware.js"

import express from "express";
const router = express.Router();

router.post("/", authenticate, createProfileController);
router.get("/me", authenticate, getMyProfileController);
router.get("/:userId", authenticate, getProfileByUserIdController);
router.put("/me", authenticate, updateProfileController);

export default router;

