import type { DerivedEvent, EventType } from "../-components/event-meta";

export function deriveEventsFromUsers(users: any[]): {
	events: DerivedEvent[];
	counts: Record<EventType | "all", number>;
} {
	const derived: DerivedEvent[] = [];
	const c: Record<EventType | "all", number> = {
		signup: 0,
		signin: 0,
		signout: 0,
		ban: 0,
		unban: 0,
		role_change: 0,
		account_delete: 0,
		session_revoke: 0,
		all: 0
	};

	for (const u of users) {
		const signup: DerivedEvent = {
			id: `signup-${u.id}`,
			type: "signup",
			userId: u.id,
			userName: u.name,
			userEmail: u.email,
			detail: u.emailVerified ? "Email verified" : "Email unverified",
			createdAt: new Date(u.createdAt)
		};
		derived.push(signup);
		c.signup++;

		if (u.banned) {
			const ban: DerivedEvent = {
				id: `ban-${u.id}`,
				type: "ban",
				userId: u.id,
				userName: u.name,
				userEmail: u.email,
				detail: u.banReason || undefined,
				createdAt: new Date(u.banExpires ?? u.createdAt)
			};
			derived.push(ban);
			c.ban++;
		}

		if (u.role === "admin") {
			const role: DerivedEvent = {
				id: `role-${u.id}`,
				type: "role_change",
				userId: u.id,
				userName: u.name,
				userEmail: u.email,
				detail: "Promoted to admin",
				createdAt: new Date(u.updatedAt ?? u.createdAt)
			};
			derived.push(role);
			c.role_change++;
		}
	}

	c.all = derived.length;

	return {
		events: derived.sort(
			(a, b) => b.createdAt.getTime() - a.createdAt.getTime()
		),
		counts: c
	};
}
