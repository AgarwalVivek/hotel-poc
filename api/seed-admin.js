/**
 * seed-admin.js — One-time script to create an admin user in Cosmos DB
 *
 * Usage:
 *   Set environment variables, then run:
 *     node seed-admin.js <username> <password>
 *
 *   Example:
 *     set COSMOS_CONNECTION_STRING=AccountEndpoint=...
 *     node api/seed-admin.js admin MySecurePassword123
 */

const { CosmosClient } = require("@azure/cosmos");
const crypto = require("crypto");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
const databaseId = process.env.COSMOS_DATABASE_ID || "hotel-poc-db";
const containerId = process.env.COSMOS_CONTAINER_ID || "enquiries";

if (!connectionString) {
  console.error("ERROR: Set COSMOS_CONNECTION_STRING environment variable first.");
  process.exit(1);
}

const username = process.argv[2];
const password = process.argv[3];

if (!username || !password) {
  console.error("Usage: node seed-admin.js <username> <password>");
  process.exit(1);
}

if (password.length < 8) {
  console.error("ERROR: Password must be at least 8 characters.");
  process.exit(1);
}

async function main() {
  const client = new CosmosClient(connectionString);
  const container = client.database(databaseId).container(containerId);

  // Check if user already exists
  const { resources: existing } = await container.items
    .query({
      query: "SELECT * FROM c WHERE c.partitionkey = @pk AND c.username = @user",
      parameters: [
        { name: "@pk", value: "admin_user" },
        { name: "@user", value: username }
      ]
    })
    .fetchAll();

  if (existing.length > 0) {
    console.error(`Admin user "${username}" already exists.`);
    process.exit(1);
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");

  const adminDoc = {
    id: `admin_${username}_${Date.now()}`,
    partitionkey: "admin_user",
    username,
    salt,
    passwordHash,
    role: "admin",
    createdAt: new Date().toISOString()
  };

  await container.items.create(adminDoc);
  console.log(`✓ Admin user "${username}" created successfully.`);
}

main().catch(err => {
  console.error("Failed to seed admin:", err.message);
  process.exit(1);
});
