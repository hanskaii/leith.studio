import { Gate, App, allow } from "@workspace/core";
import "@workspace/config";
import { appConfig } from "@workspace/config";
import { users, eq } from "@workspace/database";

export const boot = () => {
	App.configure(appConfig);
	App.payments([...appConfig.payments]);

	Gate.before(async (action, ctx) => {
		const context = ctx as any;

		// Global admin bypass — admins skip all policy checks
		if (context.actor?.role === "admin") return allow();

		if (action === "user.delete:before") {
			return await Gate.can("account.delete.grace-period", {
				actor: { id: context.userId, role: context.role ?? "user" },
				resource: { createdAt: context.createdAt }
			});
		}
	});

	Gate.after("user.created", async (ctx) => {
		const { userId, email } = ctx;
		console.log(`[API Boot] User created: ${userId} (${email})`);
	});

	Gate.after("subscription.active", async (ctx) => {
		const { db, payload } = ctx;
		const userId =
			payload.data?.metadata?.userId || payload.data?.metadata?.user_id;

		if (userId) {
			console.log(
				`[Billing Sync] Subscription active: ${ctx.subscriptionId} for user ${userId}`
			);
			await db
				.update(users)
				.set({
					subscriptionStatus: "active",
					subscriptionId: payload.data.subscription_id,
					subscriptionPlanId: payload.data.plan_id
				})
				.where(eq(users.id, userId));
		}
	});

	Gate.after("subscription.cancelled", async (ctx) => {
		const { db, payload } = ctx;
		const userId =
			payload.data?.metadata?.userId || payload.data?.metadata?.user_id;
		if (userId) {
			console.log(
				`[Billing Sync] Subscription cancelled: ${ctx.subscriptionId} for user ${userId}`
			);
			await db
				.update(users)
				.set({
					subscriptionStatus: "cancelled"
				})
				.where(eq(users.id, userId));
		}
	});

	Gate.after("payment.succeeded", async (ctx) => {
		const { db, payload } = ctx;
		const userId =
			payload.data?.metadata?.userId || payload.data?.metadata?.user_id;

		if (!userId) return;

		const productId = payload.data.product_id;
		const plan = appConfig.payments.find((p) => p.productId === productId);

		if (!plan) return;

		console.log(
			`[Billing Sync] Payment succeeded: ${ctx.paymentId} for product ${plan.name} (User: ${userId})`
		);

		if (plan.type === "credits") {
			const creditAmount = plan.creditAmount;
			console.log(
				`[Billing Sync] Granting ${creditAmount} credits to user ${userId}`
			);
			const user = await db.query.users.findFirst({
				where: eq(users.id, userId)
			});
			await db
				.update(users)
				.set({
					credits: (user?.credits || 0) + creditAmount
				})
				.where(eq(users.id, userId));
		} else if (plan.interval === "one-time") {
			await db
				.update(users)
				.set({
					subscriptionStatus: "lifetime"
				})
				.where(eq(users.id, userId));
		}
	});

	Gate.after("credit.added", async (ctx) => {
		const { db, payload } = ctx;
		const dodoCustomerId = payload.data.customer_id;
		const balanceAfter = payload.data.balance_after;

		if (dodoCustomerId) {
			console.log(
				`[Billing Sync] Credits added. New balance for customer ${dodoCustomerId}: ${balanceAfter}`
			);
			await db
				.update(users)
				.set({
					credits: parseInt(balanceAfter)
				})
				.where(eq(users.dodoCustomerId, dodoCustomerId));
		}
	});

	Gate.after("license.activated" as any, async (ctx: any) => {
		console.log(`[License] Activated for user ${ctx.userId}`);
	});

	Gate.after("credit.deducted", async (ctx) => {
		const { db, payload } = ctx;
		const dodoCustomerId = payload.data.customer_id;
		const balanceAfter = payload.data.balance_after;

		if (dodoCustomerId) {
			console.log(
				`[Billing Sync] Credits deducted. New balance for customer ${dodoCustomerId}: ${balanceAfter}`
			);
			await db
				.update(users)
				.set({
					credits: parseInt(balanceAfter)
				})
				.where(eq(users.dodoCustomerId, dodoCustomerId));
		}
	});

	console.log("🚀 API System Booted");
};
