import { type Config, defineConfig } from "drizzle-kit";
import { getD1DBPath } from "./utils/d1";

const isProduction = process.env.NODE_ENV === "production";
const localDbPath = !isProduction ? getD1DBPath("") : undefined;

export default defineConfig({
	dialect: "sqlite",
	schema: "./schema",
	out: "./drizzle",
	...(isProduction
		? {
				driver: "d1-http",
				dbCredentials: {
					accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
					databaseId: process.env.CLOUDFLARE_DATABASE_ID,
					token: process.env.CLOUDFLARE_TOKEN
				}
			}
		: {
				dbCredentials: {
					url: localDbPath ? `file:${localDbPath}` : ""
				}
			})
}) satisfies Config;
