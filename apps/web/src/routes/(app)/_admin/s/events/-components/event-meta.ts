import {
	UserCircleIcon,
	Login01Icon,
	ArrowRight01Icon,
	Cancel01Icon,
	CheckmarkCircle01Icon,
	Shield01Icon,
	Delete01Icon,
	SparklesIcon
} from "@hugeicons/core-free-icons";

export type EventType =
	| "signup"
	| "signin"
	| "signout"
	| "ban"
	| "unban"
	| "role_change"
	| "account_delete"
	| "session_revoke";

export type DerivedEvent = {
	id: string;
	type: EventType;
	userId: string;
	userName?: string;
	userEmail?: string;
	detail?: string;
	createdAt: Date;
};

export const EVENT_META: Record<
	EventType,
	{ label: string; icon: any; color: string; bg: string }
> = {
	signup: {
		label: "User Signup",
		icon: UserCircleIcon,
		color: "text-emerald-500",
		bg: "bg-emerald-500/10"
	},
	signin: {
		label: "Sign In",
		icon: Login01Icon,
		color: "text-blue-500",
		bg: "bg-blue-500/10"
	},
	signout: {
		label: "Sign Out",
		icon: ArrowRight01Icon,
		color: "text-slate-500",
		bg: "bg-slate-500/10"
	},
	ban: {
		label: "User Banned",
		icon: Cancel01Icon,
		color: "text-destructive",
		bg: "bg-destructive/10"
	},
	unban: {
		label: "User Unbanned",
		icon: CheckmarkCircle01Icon,
		color: "text-emerald-500",
		bg: "bg-emerald-500/10"
	},
	role_change: {
		label: "Role Changed",
		icon: Shield01Icon,
		color: "text-amber-500",
		bg: "bg-amber-500/10"
	},
	account_delete: {
		label: "Account Deleted",
		icon: Delete01Icon,
		color: "text-destructive",
		bg: "bg-destructive/10"
	},
	session_revoke: {
		label: "Session Revoked",
		icon: SparklesIcon,
		color: "text-purple-500",
		bg: "bg-purple-500/10"
	}
};
