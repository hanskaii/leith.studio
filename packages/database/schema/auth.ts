import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	username: text("username").unique(),
	email: text("email").notNull().unique(),
	emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
	image: text("image"),
	role: text("role").notNull().default("user"),
	banned: integer("banned", { mode: "boolean" }).default(false).notNull(),
	banReason: text("ban_reason"),
	banExpires: integer("ban_expires", { mode: "timestamp" }),

	dodoCustomerId: text("dodo_customer_id"),
	subscriptionStatus: text("subscription_status"),
	subscriptionId: text("subscription_id"),
	subscriptionPlanId: text("subscription_plan_id"),
	credits: integer("credits").notNull().default(0),

	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp" })
		.$onUpdate(() => new Date())
		.notNull()
});

export const sessions = sqliteTable(
	"sessions",
	{
		id: text("id").primaryKey(),
		expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
		token: text("token").notNull().unique(),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.$onUpdate(() => new Date())
			.notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		impersonatedBy: text("impersonated_by")
	},
	(table) => [index("idx_session_user_id").on(table.userId)]
);

export const accounts = sqliteTable(
	"accounts",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: integer("access_token_expires_at", {
			mode: "timestamp"
		}),
		refreshTokenExpiresAt: integer("refresh_token_expires_at", {
			mode: "timestamp"
		}),
		scope: text("scope"),
		password: text("password"),
		createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp" })
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index("idx_account_user_id").on(table.userId),
		index("idx_account_provider_account").on(
			table.providerId,
			table.accountId
		)
	]
);

export const verifications = sqliteTable(
	"verifications",
	{
		id: text("id").primaryKey(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
		createdAt: integer("created_at", { mode: "timestamp" }),
		updatedAt: integer("updated_at", { mode: "timestamp" })
	},
	(table) => [
		index("idx_verification_identifier").on(table.identifier),
		index("idx_verification_expires_at").on(table.expiresAt)
	]
);

export const userRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
	accounts: many(accounts)
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id]
	})
}));

export const accountRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id]
	})
}));
