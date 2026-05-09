import { MongoClient } from "mongodb";
import { env } from "@/lib/env";

type GlobalMongo = typeof globalThis & {
  __zenithMongoClient?: MongoClient;
};

const globalMongo = globalThis as GlobalMongo;

export function getMongoClient() {
  if (globalMongo.__zenithMongoClient) return globalMongo.__zenithMongoClient;

  const client = new MongoClient(env.MONGODB_URI);
  if (env.NODE_ENV !== "production") {
    globalMongo.__zenithMongoClient = client;
  }
  return client;
}

export async function getDb() {
  const client = getMongoClient();
  await client.connect();
  return client.db(env.MONGODB_DB);
}
