const { CosmosClient } = require("@azure/cosmos");
const crypto = require("crypto");

let cosmosContainer;

function getCosmosContainer() {
  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  const databaseId = process.env.COSMOS_DATABASE_ID || "hotel-poc-db";
  const containerId = process.env.COSMOS_CONTAINER_ID || "enquiries";

  if (!connectionString || !databaseId || !containerId) {
    throw new Error("Missing Cosmos DB configuration.");
  }

  if (!cosmosContainer) {
    const client = new CosmosClient(connectionString);
    cosmosContainer = client.database(databaseId).container(containerId);
  }

  return cosmosContainer;
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = async function (context, req) {
  try {
    const body = req.body || {};
    const username = (body.username || "").trim();
    const password = (body.password || "").trim();

    if (!username || !password) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: { success: false, error: "Username and password are required." }
      };
      return;
    }

    const container = getCosmosContainer();

    const { resources } = await container.items
      .query({
        query: "SELECT * FROM c WHERE c.partitionkey = @pk AND c.username = @user",
        parameters: [
          { name: "@pk", value: "admin_user" },
          { name: "@user", value: username }
        ]
      })
      .fetchAll();

    if (resources.length === 0) {
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: { success: false, error: "Invalid username or password." }
      };
      return;
    }

    const adminUser = resources[0];
    const hashedInput = hashPassword(password, adminUser.salt);

    if (hashedInput !== adminUser.passwordHash) {
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: { success: false, error: "Invalid username or password." }
      };
      return;
    }

    // Generate a session token and store it
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    await container.items.create({
      id: `session_${token.slice(0, 12)}`,
      partitionkey: "admin_session",
      token,
      username: adminUser.username,
      createdAt: new Date().toISOString(),
      expiresAt
    });

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        success: true,
        token,
        username: adminUser.username,
        expiresAt
      }
    };
  } catch (error) {
    context.log.error("Admin login error:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { success: false, error: "Login failed. Please try again." }
    };
  }
};
