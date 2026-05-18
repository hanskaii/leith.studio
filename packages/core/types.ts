import type { DatabaseInstance } from "@workspace/database";

export interface PolicyResult {
	allowed: boolean;
	code?: string;
	message?: string;
}

/**
 * Minimal identity slice passed to every policy.
 * Structurally compatible with the Better Auth User type — pass `actor: user` directly.
 */
export interface Actor {
	id: string;
	role?: string | null;
	subscriptionStatus?: string | null;
}

/**
 * Base context for all app-level policies.
 * Policies receive an actor and optional resource — never a DB instance.
 */
export interface BasePolicyContext {
	actor: Actor;
}

/**
 * Base context for database hook events.
 * Separate from BasePolicyContext — hooks carry userId + db, policies carry actor.
 */
export interface HookContext {
	userId: string;
	db: DatabaseInstance;
}

// Hook contexts — used by packages/auth/hooks/database.hooks.ts
export interface BeforeUserCreatedContext extends HookContext {
	data: any;
}
export interface BeforeUserUpdatedContext extends HookContext {
	data: any;
}
export interface AfterUserCreatedContext extends HookContext {
	email: string;
	timestamp?: string;
}
export interface AfterUserUpdatedContext extends HookContext {
	timestamp?: string;
}
export interface BeforeUserDeletedContext extends HookContext {
	createdAt?: Date | string;
}
export interface AfterUserDeletedContext extends HookContext {
	timestamp?: string;
}

export interface BeforeSessionCreatedContext extends HookContext {
	data: any;
}
export interface AfterSessionCreatedContext extends HookContext {
	sessionId: string;
	userAgent?: string;
	ipAddress?: string;
}
export interface BeforeSessionUpdatedContext extends HookContext {
	data: any;
}
export interface AfterSessionUpdatedContext extends HookContext {
	sessionId: string;
}
export interface BeforeSessionDeletedContext extends HookContext {}
export interface AfterSessionDeletedContext extends HookContext {
	sessionId: string;
}

export interface BeforeAccountCreatedContext extends HookContext {
	data: any;
}
export interface AfterAccountCreatedContext extends HookContext {
	accountId: string;
	provider: string;
}
export interface BeforeAccountUpdatedContext extends HookContext {
	data: any;
}
export interface AfterAccountUpdatedContext extends HookContext {
	accountId: string;
	provider: string;
}
export interface BeforeAccountDeletedContext extends HookContext {}
export interface AfterAccountDeletedContext extends HookContext {
	accountId: string;
	provider: string;
}

export interface BeforeVerificationCreatedContext {
	db: DatabaseInstance;
	data: any;
}
export interface AfterVerificationCreatedContext {
	db: DatabaseInstance;
	id: string;
	identifier: string;
	value: string;
	expiresAt: Date;
}
export interface BeforeVerificationUpdatedContext {
	db: DatabaseInstance;
	data: any;
}
export interface AfterVerificationUpdatedContext {
	db: DatabaseInstance;
	id: string;
}
export interface BeforeVerificationDeletedContext {
	db: DatabaseInstance;
}
export interface AfterVerificationDeletedContext {
	db: DatabaseInstance;
	id: string;
}

export interface PaymentContext {
	db: DatabaseInstance;
	paymentId?: string;
	subscriptionId?: string;
	customerId?: string;
	payload: any;
}

// Hook-triggered "before" actions used by database.hooks.ts via Gate.can()
export interface HookActions {
	"user.create:before": BeforeUserCreatedContext;
	"user.update:before": BeforeUserUpdatedContext;
	"user.delete:before": BeforeUserDeletedContext;
	"session.create:before": BeforeSessionCreatedContext;
	"session.update:before": BeforeSessionUpdatedContext;
	"session.delete:before": BeforeSessionDeletedContext;
	"account.create:before": BeforeAccountCreatedContext;
	"account.update:before": BeforeAccountUpdatedContext;
	"account.delete:before": BeforeAccountDeletedContext;
	"verification.create:before": BeforeVerificationCreatedContext;
	"verification.update:before": BeforeVerificationUpdatedContext;
	"verification.delete:before": BeforeVerificationDeletedContext;
}

/**
 * Utility type: infer a flat action map from a policy object.
 * Used by @workspace/config (and user packages) to augment GateActions.
 *
 * @example
 * declare module "@workspace/core" {
 *   interface GateActions extends InferPolicyActions<typeof UserPolicy> {}
 * }
 */
export type InferPolicyActions<
	T extends Record<string, { action: string; fn: (ctx: any) => any }>
> = {
	[K in keyof T as T[K]["action"]]: Parameters<T[K]["fn"]>[0];
};

/**
 * GateActions is an open interface — extend it via module augmentation in
 * your @workspace/config package to add app-specific policy action types.
 */
export interface GateActions extends HookActions {}

export interface GateEvents {
	"user.created": AfterUserCreatedContext;
	"user.updated": AfterUserUpdatedContext;
	"user.deleted": AfterUserDeletedContext;
	"session.created": AfterSessionCreatedContext;
	"session.updated": AfterSessionUpdatedContext;
	"session.deleted": AfterSessionDeletedContext;
	"account.created": AfterAccountCreatedContext;
	"account.updated": AfterAccountUpdatedContext;
	"account.deleted": AfterAccountDeletedContext;
	"verification.created": AfterVerificationCreatedContext;
	"verification.updated": AfterVerificationUpdatedContext;
	"verification.deleted": AfterVerificationDeletedContext;
	"payment.webhook": PaymentContext;
	"payment.succeeded": PaymentContext;
	"payment.failed": PaymentContext;
	"subscription.active": PaymentContext;
	"subscription.cancelled": PaymentContext;
	"subscription.renewed": PaymentContext;
	"credit.added": PaymentContext;
	"credit.deducted": PaymentContext;
	"refund.succeeded": PaymentContext;
}
