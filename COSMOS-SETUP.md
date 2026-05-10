# Cosmos DB Setup for Hotel POC

## Cosmos DB resource
Use your existing Azure Cosmos DB for NoSQL account.

Create this database/container:

```text
Database ID: hotel-poc-db
Container ID: enquiries
Partition key: /partitionKey
```

Each enquiry document uses:

```json
"partitionKey": "enquiry"
```

## Azure Static Web App environment variables
In Azure Portal:

```text
Static Web App → Environment variables
```

Add these values:

```text
COSMOS_CONNECTION_STRING = <Cosmos DB primary connection string>
COSMOS_DATABASE_ID = hotel-poc-db
COSMOS_CONTAINER_ID = enquiries
```

## Deployment config
The workflow must use:

```yaml
app_location: "/"
api_location: "api"
output_location: ""
skip_app_build: true
```

This means:

```text
Frontend: upload static HTML/CSS/JS as-is
API: build and deploy Azure Functions from /api
```

## Runtime flow

```text
Customer submits enquiry
  ↓
js/main.js calls POST /api/enquiries
  ↓
Azure Static Web Apps routes to api/enquiries/index.js
  ↓
Azure Function writes enquiry into Cosmos DB
```
