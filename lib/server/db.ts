import { MongoClient, Db, Collection, Document } from "mongodb";

const USERS_COLLECTION = "users";
const PRODUCTS_COLLECTION = "products";
const SALES_COLLECTION = "sales";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function buildMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (uri) return uri;

  const user = process.env.MONGODB_USER;
  const password = process.env.MONGODB_PASSWORD;
  const host = process.env.MONGODB_HOST;
  const port = process.env.MONGODB_PORT;

  return `mongodb://${user}:${password}@${host}:${port}/?authSource=admin`;
}

function getDatabaseName(): string {
  return process.env.MONGODB_DATABASE || "camisetas";
}

async function connect(): Promise<MongoClient> {
  const uri = buildMongoUri();
  const client = new MongoClient(uri, {
    maxPoolSize: 100,
    minPoolSize: 10,
    maxIdleTimeMS: 5 * 60 * 1000,
    serverSelectionTimeoutMS: 10_000,
  });

  await client.connect();
  await client.db(getDatabaseName()).command({ ping: 1 });
  return client;
}

function getClientPromise(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = connect();
    }
    return global._mongoClientPromise;
  }
  return connect();
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(getDatabaseName());
}

export async function getCollection<T extends Document = Document>(
  name: string
): Promise<Collection<T>> {
  const db = await getDb();
  return db.collection<T>(name);
}

export async function getUsersCollection<T extends Document = Document>() {
  return getCollection<T>(USERS_COLLECTION);
}

export async function getProductsCollection<T extends Document = Document>() {
  return getCollection<T>(PRODUCTS_COLLECTION);
}

export async function getSalesCollection<T extends Document = Document>() {
  return getCollection<T>(SALES_COLLECTION);
}

let indexesCreated = false;

export async function ensureIndexes(): Promise<void> {
  if (indexesCreated) return;

  const db = await getDb();

  await db.collection(USERS_COLLECTION).createIndex({ email: 1 }, { unique: true });

  const products = db.collection(PRODUCTS_COLLECTION);
  await products.createIndexes([
    { key: { team: 1 } },
    { key: { league: 1 } },
    { key: { category: 1 } },
    { key: { is_active: 1 } },
    { key: { slug: 1 } },
    { key: { sku: 1 }, unique: true, sparse: true },
    { key: { type: 1 } },
    { key: { sizes: 1 } },
  ]);

  const sales = db.collection(SALES_COLLECTION);
  await sales.createIndexes([
    { key: { product_id: 1 } },
    { key: { created_at: -1 } },
  ]);

  indexesCreated = true;
}

export { USERS_COLLECTION, PRODUCTS_COLLECTION, SALES_COLLECTION };
