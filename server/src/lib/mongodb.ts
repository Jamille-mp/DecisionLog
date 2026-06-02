import "dotenv/config";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URL || "mongodb://localhost:27017/decisionlog_logs";
const client = new MongoClient(uri);

let connection: Promise<MongoClient> | null = null;

function getClient() {
  if (!connection) {
    connection = client.connect();
  }

  return connection;
}

export async function logActivity(
  action: string,
  details: Record<string, unknown>,
  userId?: string,
  companyId?: string,
) {
  try {
    const connectedClient = await getClient();
    const database = connectedClient.db("decisionlog_logs");
    const logs = database.collection("audit_logs");

    await logs.insertOne({
      action,
      userId,
      companyId,
      details,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Erro ao gravar log no MongoDB:", error);
  }
}

export async function listAuditLogs(limit = 50, companyId?: string) {
  const connectedClient = await getClient();
  const database = connectedClient.db("decisionlog_logs");
  const logs = database.collection("audit_logs");

  return logs
    .find(companyId ? { companyId } : {})
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

export async function listAuditLogsByDecision(
  decisionId: string,
  limit = 50,
  companyId?: string,
) {
  const connectedClient = await getClient();
  const database = connectedClient.db("decisionlog_logs");
  const logs = database.collection("audit_logs");

  return logs
    .find({
      "details.decisionId": decisionId,
      ...(companyId ? { companyId } : {}),
    })
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

export async function checkMongoHealth() {
  const connectedClient = await getClient();
  const database = connectedClient.db("decisionlog_logs");
  await database.command({ ping: 1 });
}
