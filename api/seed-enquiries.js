/**
 * seed-enquiries.js — Bulk seed random enquiries into Cosmos DB
 *
 * Usage:
 *   set COSMOS_CONNECTION_STRING=AccountEndpoint=...
 *   node api/seed-enquiries.js [count]
 *
 * Default count: 1000
 * Uses parallel batch operations for maximum throughput.
 */

const { CosmosClient, BulkOperationType } = require("@azure/cosmos");

const connectionString = process.env.COSMOS_CONNECTION_STRING;
const databaseId = process.env.COSMOS_DATABASE_ID || "hotel-poc-db";
const containerId = process.env.COSMOS_CONTAINER_ID || "enquiries";

if (!connectionString) {
  console.error("ERROR: Set COSMOS_CONNECTION_STRING environment variable.");
  process.exit(1);
}

const COUNT = parseInt(process.argv[2]) || 1000;
const BATCH_SIZE = 100; // Cosmos DB bulk ops limit per batch

// ── Random data pools ───────────────────────────────────

const firstNames = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan",
  "Krishna", "Ishaan", "Ananya", "Diya", "Priya", "Meera", "Kavya", "Riya",
  "Isha", "Saanvi", "Aanya", "Pooja", "Rahul", "Amit", "Deepak", "Sunil",
  "Vikram", "Neha", "Sneha", "Anjali", "Swati", "Nisha", "Rohan", "Karan",
  "Manish", "Gaurav", "Sanjay", "Lakshmi", "Sunita", "Rekha", "Geeta", "Suman",
  "James", "Sarah", "Michael", "Emma", "David", "Sophie", "John", "Alice",
  "Robert", "Maria", "William", "Lisa", "Richard", "Jennifer", "Thomas", "Emily"
];

const lastNames = [
  "Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Das", "Nair",
  "Reddy", "Joshi", "Mishra", "Rao", "Iyer", "Menon", "Chopra", "Mehta",
  "Agarwal", "Banerjee", "Mukherjee", "Chatterjee", "Shah", "Pandey", "Dubey",
  "Sinha", "Tiwari", "Smith", "Johnson", "Williams", "Brown", "Jones",
  "Garcia", "Miller", "Davis", "Wilson", "Anderson", "Taylor", "Moore", "Clark"
];

const domains = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "protonmail.com",
  "icloud.com", "rediffmail.com", "company.co.in", "work.com", "mail.com"
];

const roomTypes = ["standard", "deluxe", "suite", "any"];

const messages = [
  "Looking forward to our stay!",
  "Can we get a room with a view?",
  "Is airport pickup available?",
  "Celebrating our anniversary, any special arrangements?",
  "Need extra bed for a child.",
  "What are the check-in and check-out times?",
  "Do you offer corporate rates?",
  "Planning a family vacation, need adjoining rooms.",
  "Is the pool heated?",
  "Can you arrange a city tour?",
  "We have dietary restrictions, is that manageable?",
  "First time visiting Jharsuguda, very excited!",
  "Need a quiet room away from the elevator.",
  "Interested in your spa services.",
  "Will be arriving late at night, is that okay?",
  "",  // some enquiries have no message
  "",
  ""
];

const statuses = ["new", "new", "new", "new", "read", "read", "closed"];

// ── Helpers ─────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(startDays, endDays) {
  const now = Date.now();
  const offset = (startDays + Math.random() * (endDays - startDays)) * 86400000;
  return new Date(now + offset).toISOString().split("T")[0];
}

function randomPastDate(maxDaysAgo) {
  const now = Date.now();
  const offset = Math.random() * maxDaysAgo * 86400000;
  return new Date(now - offset).toISOString();
}

function generateEnquiry() {
  const firstName = pick(firstNames);
  const lastName = pick(lastNames);
  const name = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${pick(domains)}`;

  const checkinOffset = Math.floor(Math.random() * 60) + 1;
  const stayLength = Math.floor(Math.random() * 7) + 1;
  const checkin = randomDate(checkinOffset, checkinOffset);
  const checkout = randomDate(checkinOffset + stayLength, checkinOffset + stayLength);

  return {
    id: `enq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    partitionkey: "enquiry",
    name,
    email,
    phone: `+91 ${Math.floor(7000000000 + Math.random() * 3000000000)}`,
    roomType: pick(roomTypes),
    checkin,
    checkout,
    message: pick(messages),
    status: pick(statuses),
    source: "website",
    createdAt: randomPastDate(90),
    updatedAt: new Date().toISOString()
  };
}

// ── Main ────────────────────────────────────────────────

async function main() {
  const client = new CosmosClient(connectionString);
  const container = client.database(databaseId).container(containerId);

  console.log(`Generating ${COUNT} enquiries...`);
  const allEnquiries = [];
  for (let i = 0; i < COUNT; i++) {
    allEnquiries.push(generateEnquiry());
  }

  console.log(`Inserting in batches of ${BATCH_SIZE} with bulk operations...`);
  const startTime = Date.now();
  let inserted = 0;
  let errors = 0;

  // Process in parallel batches
  const batches = [];
  for (let i = 0; i < allEnquiries.length; i += BATCH_SIZE) {
    batches.push(allEnquiries.slice(i, i + BATCH_SIZE));
  }

  // Run batches with concurrency limit
  const CONCURRENCY = 10;
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const chunk = batches.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      chunk.map(async (batch) => {
        const operations = batch.map((item) => ({
          operationType: BulkOperationType.Create,
          resourceBody: item
        }));

        try {
          const response = await container.items.bulk(operations);
          let ok = 0;
          let fail = 0;
          for (const r of response) {
            if (r.statusCode >= 200 && r.statusCode < 300) ok++;
            else fail++;
          }
          return { ok, fail };
        } catch (err) {
          // Fallback to individual creates if bulk fails
          let ok = 0;
          let fail = 0;
          for (const item of batch) {
            try {
              await container.items.create(item);
              ok++;
            } catch (e) {
              fail++;
            }
          }
          return { ok, fail };
        }
      })
    );

    for (const r of results) {
      inserted += r.ok;
      errors += r.fail;
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const rps = (inserted / ((Date.now() - startTime) / 1000)).toFixed(0);
    process.stdout.write(
      `\r  ✓ ${inserted}/${COUNT} inserted (${errors} errors) — ${elapsed}s — ${rps} docs/sec`
    );
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n\nDone! ${inserted} enquiries inserted in ${totalTime}s`);
  if (errors > 0) console.log(`  ⚠ ${errors} failed`);
}

main().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
