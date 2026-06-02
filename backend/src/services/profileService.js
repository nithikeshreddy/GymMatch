import {
    createProfile,
    getProfileByUserId,
    updateProfile as updateProfileRepo
} from "../repositories/profileRepository.js";


export async function createProfileService(userId, data) {
    const existingProfile = await getProfileByUserId(userId);

    if (existingProfile) {
        throw new Error("Profile already exists");
    }

    const profile = await createProfile(userId, data);

    return profile;
}

export async function getMyProfile(userId) {
    const profile = await getProfileByUserId(userId);

    if (!profile) {
        throw new Error("Profile not found. Please create one first.");
    }

    return profile;
}


export async function updateProfileService(userId, data) {
    const existingProfile = await getProfileByUserId(userId);

    if (!existingProfile) {
        throw new Error("Profile does not exist");
    }

    const updatedProfile = await updateProfileRepo(userId, data);

    return updatedProfile;
}


export async function getProfileById(userId) {
    const profile = await getProfileByUserId(userId);

    if (!profile) {
        throw new Error("Profile not found");
    }

    return profile;
}