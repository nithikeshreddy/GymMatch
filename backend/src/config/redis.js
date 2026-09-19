import {createClient} from "redis";

const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
    // Fail commands during an outage instead of queuing committed HTTP writes.
    disableOfflineQueue: true
});


redisClient.on("error", (err)=>{
    console.error("Redis Error:", err);
});

await redisClient.connect();

export default redisClient;
