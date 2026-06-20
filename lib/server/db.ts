import { MongoClient, Db, Collection, Document } from "mongodb";

const USERS_COLLECTION = "users";
const PRODUCTS_COLLECTION = "products";
const SALES_COLLECTION = "sales";
const EXTERNAL_SELLERS_COLLECTION = "external_sellers";
const SUPPLIERS_COLLECTION = "suppliers";
const SUPPLIER_ORDERS_COLLECTION = "supplier_orders";
const COMMISSIONS_COLLECTION = "commissions";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function buildMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (uri) return resolveLocalMongoUri(uri);

  const user = process.env.MONGODB_USER;
  const password = process.env.MONGODB_PASSWORD;
  const host = process.env.MONGODB_HOST;
  const port = process.env.MONGODB_PORT;

  return resolveLocalMongoUri(`mongodb://${user}:${password}@${host}:${port}/?authSource=admin`);
}

function getDatabaseName(): string {
  return process.env.MONGODB_DATABASE || "camisetas";
}

function resolveLocalMongoUri(uri: string): string {
  if (process.env.NODE_ENV === "production") return uri;

  try {
    const parsed = new URL(uri);
    if (parsed.hostname !== "mongodb") return uri;

    parsed.hostname = "localhost";
    return parsed.toString();
  } catch {
    return uri.replace("@mongodb:", "@localhost:");
  }
}

async function connect(): Promise<MongoClient> {
  const uri = buildMongoUri();
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 1,
    maxIdleTimeMS: 5 * 60 * 1000,
    serverSelectionTimeoutMS: 10_000,
  });

  await client.connect();
  await client.db(getDatabaseName()).command({ ping: 1 });
  return client;
}

function getClientPromise(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = connect().catch((err) => {
      global._mongoClientPromise = undefined;
      throw err;
    });
  }
  return global._mongoClientPromise;
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

export async function getExternalSellersCollection<T extends Document = Document>() {
  return getCollection<T>(EXTERNAL_SELLERS_COLLECTION);
}

export async function getSuppliersCollection<T extends Document = Document>() {
  return getCollection<T>(SUPPLIERS_COLLECTION);
}

export async function getSupplierOrdersCollection<T extends Document = Document>() {
  return getCollection<T>(SUPPLIER_ORDERS_COLLECTION);
}

export async function getCommissionsCollection<T extends Document = Document>() {
  return getCollection<T>(COMMISSIONS_COLLECTION);
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
    { key: { external_seller_id: 1 } },
  ]);

  const externalSellers = db.collection(EXTERNAL_SELLERS_COLLECTION);
  await externalSellers.createIndexes([{ key: { name: 1 } }]);

  const suppliers = db.collection(SUPPLIERS_COLLECTION);
  await suppliers.createIndexes([{ key: { name: 1 } }]);

  const supplierOrders = db.collection(SUPPLIER_ORDERS_COLLECTION);
  await supplierOrders.createIndexes([
    { key: { created_at: -1 } },
    { key: { supplier_id: 1 } },
    { key: { status: 1 } },
    { key: { name: 1 } },
  ]);

  const commissions = db.collection(COMMISSIONS_COLLECTION);
  await commissions.createIndexes([
    { key: { created_at: -1 } },
    { key: { status: 1 } },
    { key: { customer_name: 1 } },
    { key: { seller_user_id: 1 } },
    { key: { external_seller_id: 1 } },
    { key: { supplier_order_id: 1 } },
  ]);

  indexesCreated = true;
}

export {
  USERS_COLLECTION,
  PRODUCTS_COLLECTION,
  SALES_COLLECTION,
  EXTERNAL_SELLERS_COLLECTION,
  SUPPLIERS_COLLECTION,
  SUPPLIER_ORDERS_COLLECTION,
  COMMISSIONS_COLLECTION,
};
