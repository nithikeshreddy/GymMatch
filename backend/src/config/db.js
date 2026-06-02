import { Pool } from "pg";

const pool = new Pool (
    {
        connectionString: process.env.DATABASE_URL,
    }
);

pool.query( "SELECT NOW()" ). then(res=>{
    console.log("DATABASE CONNECTED", res.rows[0]);
}).catch(err=>{
    console.log("DATABASE Connection Error", err);
});

export default pool;

