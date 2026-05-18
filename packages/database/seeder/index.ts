import fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { drizzle as sqliteDrizzle } from "drizzle-orm/better-sqlite3";

// Load .env relative to this file for fallback credentials
try {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	const envPath = join(__dirname, "../.env");
	if (fs.existsSync(envPath)) {
		const envContent = fs.readFileSync(envPath, "utf-8");
		for (const line of envContent.split("\n")) {
			const [key, ...valueParts] = line.split("=");
			if (key && valueParts.length > 0) {
				const value = valueParts.join("=");
				process.env[key.trim()] = value.trim().replace(/^"|"$/g, "");
			}
		}
	}
} catch {
	// IgnoreErrors
}

import { drizzle as proxyDrizzle } from "drizzle-orm/sqlite-proxy";
import * as schema from "../schema";
import { getD1DBPath } from "../utils/d1";
import { seedUsers } from "./seeds";

function createRemoteCallback() {
	const { CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_TOKEN } =
		process.env;

	if (
		!CLOUDFLARE_ACCOUNT_ID ||
		!CLOUDFLARE_DATABASE_ID ||
		!CLOUDFLARE_TOKEN
	) {
		throw new Error(
			"Missing env vars: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_TOKEN"
		);
	}

	const callback: Parameters<typeof proxyDrizzle>[0] = async (
		sql,
		params,
		method
	) => {
		const res = await fetch(
			`https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_DATABASE_ID}/${
				method === "values" ? "raw" : "query"
			}`,
			{
				method: "POST",
				body: JSON.stringify({ sql, params }),
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${CLOUDFLARE_TOKEN}`
				}
			}
		);

		const data = (await res.json()) as
			| {
					success: true;
					result: {
						results:
							| unknown[]
							| { columns: string[]; rows: unknown[][] };
					}[];
			  }
			| { success: false; errors: { code: number; message: string }[] };

		if (!data.success) {
			throw new Error(
				data.errors.map((it) => `${it.code}: ${it.message}`).join("\n")
			);
		}

		const result = data.result[0]?.results;
		const rows = Array.isArray(result) ? result : result.rows;

		return { rows };
	};

	return callback;
}

function createDb(): any {
	const isRemote = process.argv.includes("--remote");

	if (isRemote) {
		console.log("🌐 Connecting to remote D1 via Cloudflare API...");
		return proxyDrizzle(createRemoteCallback(), { schema });
	}

	const dbPath = getD1DBPath("");
	console.log(`🔌 Using local D1 at: ${dbPath}`);
	const sqlite = new Database(dbPath);
	return sqliteDrizzle(sqlite, { schema });
}

async function runSeeder() {
	console.log("🌱 Starting database seeding...\n");

	const db = createDb() as any;

	try {
		await seedUsers(db);
		console.log("\n✅ Database seeding completed successfully!");
	} catch (error) {
		console.error("\n❌ Error seeding database:", error);
		process.exit(1);
	}
}

runSeeder();
