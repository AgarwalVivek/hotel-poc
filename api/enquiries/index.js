const { CosmosClient } = require("@azure/cosmos");

let cosmosContainer;

function getCosmosContainer() {
  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  const database = client.database("hotel-poc-db");
  const container = database.container("enquiries");

  if (!connectionString || !databaseId || !containerId) {
    throw new Error(
      "Missing Cosmos DB configuration. Required: COSMOS_CONNECTION_STRING, COSMOS_DATABASE_ID, COSMOS_CONTAINER_ID."
    );
  }

  if (!cosmosContainer) {
    const client = new CosmosClient(connectionString);
    cosmosContainer = client.database(databaseId).container(containerId);
  }

  return cosmosContainer;
}

function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

module.exports = async function (context, req) {
  try {
    const body = req.body || {};

    const name = sanitizeText(body.name);
    const email = sanitizeText(body.email);

    if (!name || !email) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: {
          success: false,
          error: "Name and email are required."
        }
      };
      return;
    }

    const enquiry = {
      id: `enq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      partitionkey: "enquiry",
      name,
      email,
      phone: sanitizeText(body.phone),
      roomType: sanitizeText(body.roomType),
      checkin: sanitizeText(body.checkin),
      checkout: sanitizeText(body.checkout),
      message: sanitizeText(body.message),
      status: "new",
      source: "website",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const container = getCosmosContainer();
    await container.items.create(enquiry);

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: {
        success: true,
        message: "Enquiry saved successfully.",
        enquiryId: enquiry.id
      }
    };
  } catch (error) {
    context.log.error("Cosmos enquiry API failed:", error);

    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        success: false,
        error: "Failed to save enquiry. Please try again later."
      }
    };
  }
};
