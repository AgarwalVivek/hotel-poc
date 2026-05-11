const { CosmosClient } = require("@azure/cosmos");
const crypto = require("crypto");

let cosmosContainer;

function getCosmosContainer() {
  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  const databaseId = process.env.COSMOS_DATABASE_ID || "hotel-poc-db";
  const containerId = process.env.COSMOS_CONTAINER_ID || "enquiries";

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

function hashPassword(password, salt) {
  return crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
}

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

module.exports = async function (context, req) {
  const action = context.bindingData.action || "";

  try {
    switch (action) {
      case "login":
        return handleLogin(context, req);
      case "verify":
        return handleVerify(context, req);
      case "":
        // Default: original enquiries behavior
        if (req.method === "GET") return handleGetEnquiries(context, req);
        return handlePostEnquiry(context, req);
      default:
        context.res = {
          status: 404,
          headers: { "Content-Type": "application/json" },
          body: { success: false, error: "Unknown action." }
        };
    }
  } catch (error) {
    context.log.error("API error:", error);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { success: false, error: error.message }
    };
  }
};

// ── Enquiries handlers ──────────────────────────────────

async function handleGetEnquiries(context, req) {
  const container = getCosmosContainer();

  const querySpec = {
    query:
      "SELECT * FROM c WHERE c.partitionkey = @pk ORDER BY c.createdAt DESC",
    parameters: [{ name: "@pk", value: "enquiry" }]
  };

  const { resources: enquiries } = await container.items
    .query(querySpec)
    .fetchAll();

  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: { success: true, enquiries }
  };
}

async function handlePostEnquiry(context, req) {
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
}

// ── Admin login handler ─────────────────────────────────

async function handleLogin(context, req) {
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
      query:
        "SELECT * FROM c WHERE c.partitionkey = @pk AND c.username = @user",
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
    body: { success: true, token, username: adminUser.username, expiresAt }
  };
}

// ── Admin verify handler ────────────────────────────────

async function handleVerify(context, req) {
  // Accept token from query param or Authorization header (SWA may strip headers)
  const authHeader = req.headers["authorization"] || "";
  const token =
    (req.query && req.query.token) ||
    authHeader.replace("Bearer ", "").trim();

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
      body: {
        success: false,
        error: "Session expired. Please log in again."
      }
    };
    return;
  }

  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: { success: true, username: session.username }
  };
}
