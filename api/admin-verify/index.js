const { CosmosClient } = require("@azure/cosmos");

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

module.exports = async function (context, req) {
  try {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: { success: false, error: "No token provided." }
      };
      return;
    }

    const container = getCosmosContainer();

    const { resources } = await container.items
      .query({
        query:
          "SELECT * FROM c WHERE c.partitionkey = @pk AND c.token = @token",
        parameters: [
          { name: "@pk", value: "admin_session" },
          { name: "@token", value: token }
        ]
      })
      .fetchAll();

    if (resources.length === 0) {
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: { success: false, error: "Invalid or expired session." }
      };
      return;
    }

    const session = resources[0];

    if (new Date(session.expiresAt) < new Date()) {
      context.res = {
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: { success: false, error: "Session expired. Please log in again." }
      };
      return;
    }

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        success: true,
        username: session.username
      }
    };
  } catch (error) {
    context.log.error("Admin verify error:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { success: false, error: "Verification failed." }
    };
  }
};
