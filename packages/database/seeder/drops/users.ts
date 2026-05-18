import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "../../schema";

export async function dropUsers(db: DrizzleD1Database<typeof schema> | any) {
	console.log("🗑️  Dropping users...");
	try {
		await db.delete(schema.users);
		console.log("✓ Users dropped");
	} catch (error) {
		console.error("Error dropping users:", error);
	}
}
