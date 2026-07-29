require("dotenv").config();

const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

console.log("=== MongoDB Atlas Connection Test ===");

if (!uri) {
    console.error("❌ MONGODB_URI not found in .env file");
    process.exit(1);
}

console.log("✅ URI loaded from .env");

async function testConnection() {
    let client;

    try {
        console.log("🔄 Connecting to MongoDB Atlas...");

        client = new MongoClient(uri);

        await client.connect();

        console.log("✅ Connected to MongoDB Atlas!");

        // Ping the database
        await client.db("admin").command({ ping: 1 });

        console.log("✅ Ping successful!");

        // List databases
        const databases = await client.db().admin().listDatabases();

        console.log("\n📂 Databases:");
        databases.databases.forEach((db) => {
            console.log(`   - ${db.name}`);
        });

    } catch (error) {
        console.error("\n❌ Connection Failed:");
        console.error(error);
    } finally {
        if (client) {
            await client.close();
            console.log("\n🔒 Connection closed.");
        }
    }
}

testConnection();