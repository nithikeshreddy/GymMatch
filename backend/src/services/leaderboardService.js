import {getLeaderboardByExercise} from "../repositories/leaderboardRepository.js";

export async function getLeaderboardService(exerciseId) {
    if(!exerciseId){
        throw new Error("exercise id is required");
    }

    const leaderboard = await getLeaderboardByExercise(exerciseId);
    return leaderboard;
}

