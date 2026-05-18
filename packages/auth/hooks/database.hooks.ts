import type { User, Session, Account, Verification } from "better-auth";
import { database } from "@workspace/database";
import { Gate } from "@workspace/core";
import type { AuthEnv } from "../auth";

export const getDatabaseHooks = (env: AuthEnv) => {
	const db = database(env.DATABASE);

	return {
		user: {
			create: {
				before: async (user: User & Record<string, unknown>) => {
					// Data normalization — belongs here, not in a policy
					if (!user.name) {
						user.name =
							(user.email as string).split("@")[0] || "User";
					}

					// Policy check — guard decisions only (allow/deny)
					const result = await Gate.can("user.create:before", {
						userId: user.id || "pending",
						data: user,
						db
					});

					if (!result.allowed) return false;
					// Return modified data so better-auth persists the changes
					return { data: user };
				},
				after: async (user: User & Record<string, unknown>) => {
					await Gate.emit("user.created", {
						userId: user.id,
						email: user.email,
						db
					});
				}
			},
			update: {
				before: async (
					user: Partial<User> & Record<string, unknown>
				) => {
					const result = await Gate.can("user.update:before", {
						userId: (user as any).id,
						data: user,
						db
					});
					return result.allowed;
				},
				after: async (user: User & Record<string, unknown>) => {
					await Gate.emit("user.updated", {
						userId: user.id,
						db,
						timestamp: new Date().toISOString()
					});
				}
			},
			delete: {
				before: async (user: User & Record<string, unknown>) => {
					const result = await Gate.can("user.delete:before", {
						userId: user.id,
						createdAt: user.createdAt,
						db
					});
					return result.allowed;
				},
				after: async (user: User & Record<string, unknown>) => {
					await Gate.emit("user.deleted", {
						userId: user.id,
						db,
						timestamp: new Date().toISOString()
					});
				}
			}
		},

		session: {
			create: {
				before: async (session: Session & Record<string, unknown>) => {
					const result = await Gate.can("session.create:before", {
						userId: session.userId,
						data: session,
						db
					});
					return result.allowed;
				},
				after: async (session: Session & Record<string, unknown>) => {
					await Gate.emit("session.created", {
						userId: session.userId,
						sessionId: session.id,
						userAgent: session.userAgent ?? undefined,
						ipAddress: session.ipAddress ?? undefined,
						db
					});
				}
			},
			update: {
				before: async (
					session: Partial<Session> & Record<string, unknown>
				) => {
					const result = await Gate.can("session.update:before", {
						userId: (session as any).userId,
						data: session,
						db
					});
					return result.allowed;
				},
				after: async (session: Session & Record<string, unknown>) => {
					await Gate.emit("session.updated", {
						userId: session.userId,
						sessionId: session.id,
						db
					});
				}
			},
			delete: {
				before: async (session: Session & Record<string, unknown>) => {
					const result = await Gate.can("session.delete:before", {
						userId: session.userId,
						db
					});
					return result.allowed;
				},
				after: async (session: Session & Record<string, unknown>) => {
					await Gate.emit("session.deleted", {
						userId: session.userId,
						sessionId: session.id,
						db
					});
				}
			}
		},

		account: {
			create: {
				before: async (account: Account) => {
					const result = await Gate.can("account.create:before", {
						userId: account.userId,
						data: account,
						db
					});
					return result.allowed;
				},
				after: async (account: Account) => {
					await Gate.emit("account.created", {
						userId: account.userId,
						accountId: account.id,
						provider: account.providerId,
						db
					});
				}
			},
			update: {
				before: async (
					account: Partial<Account> & Record<string, unknown>
				) => {
					const result = await Gate.can("account.update:before", {
						userId: (account as any).userId,
						data: account,
						db
					});
					return result.allowed;
				},
				after: async (account: Account & Record<string, unknown>) => {
					await Gate.emit("account.updated", {
						userId: account.userId,
						accountId: account.id,
						provider: account.providerId,
						db
					});
				}
			},
			delete: {
				before: async (account: Account & Record<string, unknown>) => {
					const result = await Gate.can("account.delete:before", {
						userId: account.userId,
						db
					});
					return result.allowed;
				},
				after: async (account: Account & Record<string, unknown>) => {
					await Gate.emit("account.deleted", {
						userId: account.userId,
						accountId: account.id,
						provider: account.providerId,
						db
					});
				}
			}
		},

		verification: {
			create: {
				before: async (
					verification: Verification & Record<string, unknown>
				) => {
					const result = await Gate.can(
						"verification.create:before",
						{
							data: verification,
							db
						} as any
					);
					return result.allowed;
				},
				after: async (
					verification: Verification & Record<string, unknown>
				) => {
					await Gate.emit("verification.created", {
						id: verification.id,
						identifier: verification.identifier,
						value: verification.value,
						expiresAt: verification.expiresAt,
						db
					});
				}
			},
			update: {
				before: async (
					verification: Partial<Verification> &
						Record<string, unknown>
				) => {
					const result = await Gate.can(
						"verification.update:before",
						{
							data: verification,
							db
						} as any
					);
					return result.allowed;
				},
				after: async (
					verification: Verification & Record<string, unknown>
				) => {
					await Gate.emit("verification.updated", {
						id: verification.id,
						db
					});
				}
			},
			delete: {
				before: async (
					_verification: Verification & Record<string, unknown>
				) => {
					const result = await Gate.can(
						"verification.delete:before",
						{
							db
						} as any
					);
					return result.allowed;
				},
				after: async (
					verification: Verification & Record<string, unknown>
				) => {
					await Gate.emit("verification.deleted", {
						id: verification.id,
						db
					});
				}
			}
		}
	};
};
