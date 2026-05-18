import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const apiKeys = sqliteTable("api_keys", {
	id: text("id").primaryKey(),
	/** Which plugin config created this key (defaults to "default") */
	configId: text("config_id").notNull().default("default"),
	name: text("name"),
	start: text("start"),
	prefix: text("prefix"),
	key: text("key").notNull(),
	/** Owner ID — userId for user-owned keys, orgId for org-owned keys */
	referenceId: text("reference_id").notNull(),
	refillInterval: integer("refill_interval"),
	refillAmount: integer("refill_amount"),
	lastRefillAt: integer("last_refill_at", { mode: "timestamp" }),
	enabled: integer("enabled", { mode: "boolean" }),
	rateLimitEnabled: integer("rate_limit_enabled", { mode: "boolean" }),
	rateLimitTimeWindow: integer("rate_limit_time_window"),
	rateLimitMax: integer("rate_limit_max"),
	requestCount: integer("request_count"),
	remaining: integer("remaining"),
	lastRequest: integer("last_request", { mode: "timestamp" }),
	expiresAt: integer("expires_at", { mode: "timestamp" }),
	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
	permissions: text("permissions"),
	metadata: text("metadata", { mode: "json" })
});
