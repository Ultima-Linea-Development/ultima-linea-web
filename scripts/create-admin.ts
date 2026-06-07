/**
 * Script para crear un usuario administrador.
 * Uso: npx tsx scripts/create-admin.ts
 *
 * Requiere variables MONGODB_* y JWT_SECRET (cargar desde .env.local).
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createInterface } from "readline";
import { randomUUID } from "crypto";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

function loadEnvFile() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function buildMongoUri(): string {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const { MONGODB_USER, MONGODB_PASSWORD, MONGODB_HOST, MONGODB_PORT } = process.env;
  return `mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT || "27017"}/?authSource=admin`;
}

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolveAnswer) => {
    rl.question(question, (answer) => {
      rl.close();
      resolveAnswer(answer.trim());
    });
  });
}

async function promptPassword(question: string): Promise<string> {
  process.stdout.write(question);
  return new Promise((resolvePassword) => {
    const stdin = process.stdin;
    stdin.resume();
    stdin.setRawMode?.(true);
    stdin.setEncoding("utf-8");

    let password = "";
    const onData = (char: string) => {
      if (char === "\r" || char === "\n" || char === "\u0004") {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolvePassword(password);
        return;
      }
      if (char === "\u0003") process.exit(1);
      if (char === "\u007f") {
        password = password.slice(0, -1);
        return;
      }
      password += char;
    };
    stdin.on("data", onData);
  });
}

async function main() {
  loadEnvFile();

  const uri = buildMongoUri();
  const dbName = process.env.MONGODB_DATABASE || "camisetas";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const users = client.db(dbName).collection("users");

    const email = await prompt("Email: ");
    const existing = await users.findOne({ email });
    if (existing) {
      console.error("Error: Un usuario con este email ya existe");
      process.exit(1);
    }

    const firstName = await prompt("Nombre: ");
    const lastName = await prompt("Apellido: ");
    const phone = await prompt("Teléfono (opcional): ");
    const password = await promptPassword("Contraseña (mínimo 6 caracteres): ");
    const confirmPassword = await promptPassword("Confirmar contraseña: ");

    if (password.length < 6) {
      console.error("Error: La contraseña debe tener al menos 6 caracteres");
      process.exit(1);
    }
    if (password !== confirmPassword) {
      console.error("Error: Las contraseñas no coinciden");
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    await users.insertOne({
      _id: randomUUID(),
      email,
      password: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      phone,
      role: "admin",
      created_at: now,
      updated_at: now,
    });

    console.log("\nUsuario administrador creado exitosamente!");
    console.log(`Email: ${email}`);
    console.log(`Nombre: ${firstName} ${lastName}`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
