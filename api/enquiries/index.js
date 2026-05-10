const { CosmosClient } = require("@azure/cosmos");

const client = new CosmosClient(process.env.COSMOS_CONNECTION_STRING);
const database = client.database(process.env.COSMOS_DATABASE_ID);
const container = database.container(process.env.COSMOS_CONTAINER_ID);

module.exports = async function (context, req) {
  try {
    const body = req.body || {};

    if (!body.name || !body.email) {
      context.res = {
        status: 400,
        body: { success: false, error: "Name and email are required." }
      };
      return;
    }

    const enquiry = {
      id: `enq_${Date.now()}`,
      partitionKey: "enquiry",
      name: body.name,
      email: body.email,
      phone: body.phone || "",
      roomType: body.roomType || "",
      checkin: body.checkin || "",
      checkout: body.checkout || "",
      message: body.message || "",
      status: "new",
      source: "website",
      createdAt: new Date().toISOString()
    };

    await container.items.create(enquiry);

    context.res = {
      status: 200,
      body: {
        success: true,
        message: "Enquiry saved successfully.",
        enquiryId: enquiry.id
      }
    };
  } catch (error) {
    context.log.error("Cosmos save failed:", error);

    context.res = {
      status: 500,
      body: {
        success: false,
        error: "Failed to save enquiry."
      }
    };
  }
};