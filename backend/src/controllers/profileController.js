import {
    createProfileService,
    updateProfileService,
    getMyProfile,
    getProfileById
} from "../services/profileService.js";


export async function createProfileController(req, res) {
    try {
        const userId = req.user.id;
        const data = req.body;

        if (!data.name) {
            return res.status(400).json({ error: "Name is required" });
        }

        const profile = await createProfileService(userId, data);

        return res.status(201).json({
            message: "Profile created successfully",
            profile
        });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}


export async function getMyProfileController(req, res) {
    try {
        const userId = req.user.id;

        const profile = await getMyProfile(userId);

        return res.status(200).json({ profile });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}


export async function updateProfileController(req, res) {
    try {
        const userId = req.user.id;
        const data = req.body;

        const updatedProfile = await updateProfileService(userId, data);

        return res.status(200).json({ profile: updatedProfile });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}


export async function getProfileByUserIdController(req, res) {
    try {
        const userId = req.params.userId;

        if (!userId) {
            return res.status(400).json({ error: "UserId param missing" });
        }

        if (req.user.id !== userId) {
            return res.status(403).json({
                error: "Unauthorized"
            });
        }

        const profile = await getProfileById(userId);

        return res.status(200).json({ profile });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
}