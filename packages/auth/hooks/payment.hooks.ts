import { Gate, type PaymentContext } from "@workspace/core";
import { database } from "@workspace/database";
import type { AuthEnv } from "../auth";

export const getPaymentHooks = (env: AuthEnv) => ({
	webhookKey: env.DODO_PAYMENTS_WEBHOOK_SECRET || "",
	onPaymentSucceeded: async (payload: any) => {
		await Gate.emit("payment.succeeded", {
			db: database(env.DATABASE),
			paymentId: payload.data.payment_id,
			payload
		} as PaymentContext);
	},
	onPaymentFailed: async (payload: any) => {
		await Gate.emit("payment.failed", {
			db: database(env.DATABASE),
			paymentId: payload.data.payment_id,
			payload
		} as PaymentContext);
	},
	onSubscriptionActive: async (payload: any) => {
		await Gate.emit("subscription.active", {
			db: database(env.DATABASE),
			subscriptionId: payload.data.subscription_id,
			payload
		} as PaymentContext);
	},
	onSubscriptionCancelled: async (payload: any) => {
		await Gate.emit("subscription.cancelled", {
			db: database(env.DATABASE),
			subscriptionId: payload.data.subscription_id,
			payload
		} as PaymentContext);
	},
	onSubscriptionRenewed: async (payload: any) => {
		await Gate.emit("subscription.renewed", {
			db: database(env.DATABASE),
			subscriptionId: payload.data.subscription_id,
			payload
		} as PaymentContext);
	},
	onRefundSucceeded: async (payload: any) => {
		await Gate.emit("refund.succeeded", {
			db: database(env.DATABASE),
			paymentId: payload.data.payment_id,
			payload
		} as PaymentContext);
	},
	onCreditAdded: async (payload: any) => {
		await Gate.emit("credit.added", {
			db: database(env.DATABASE),
			payload
		} as any);
	},
	onCreditDeducted: async (payload: any) => {
		await Gate.emit("credit.deducted", {
			db: database(env.DATABASE),
			payload
		} as any);
	}
});
