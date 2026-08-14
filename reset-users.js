const postgres = require('postgres');

const sql = postgres(process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5432/postgres');

async function main() {
    try {
        console.log("Dropping old users table to allow uuid conversion...");
        await sql`DROP TABLE IF EXISTS "users" CASCADE;`;
        console.log("Successfully dropped users table.");
    } catch (err) {
        console.error("Error dropping table:", err);
    } finally {
        process.exit(0);
    }
}

main();
