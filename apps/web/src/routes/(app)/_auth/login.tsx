import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { ThemeToggle } from "@/routes/-components/layouts/theme-toggle";
import { LoginForm } from "./-components/login-form";

const loginSearchSchema = z.object({
	redirect: z.string().optional()
});

export const Route = createFileRoute("/(app)/_auth/login")({
	validateSearch: loginSearchSchema,
	component: LoginPage,
	head: () => ({
		meta: [
			{ title: "Sign in — Leith" },
			{
				name: "description",
				content: "Sign in to your Leith account."
			}
		]
	})
});

function LoginPage() {
	const search = useSearch({ from: "/(app)/_auth/login" });

	return (
		<div className="flex min-h-[100dvh] flex-col">
			{/* Top bar */}
			<header className="flex h-20 items-center justify-between border-b border-border/40 px-5 sm:px-8">
				<Link
					to="/"
					className="font-heading text-xl font-black tracking-tight text-foreground transition-opacity hover:opacity-70"
				>
					leith
				</Link>
				<ThemeToggle />
			</header>

			{/* Centered form */}
			<div className="flex flex-1 items-center justify-center px-5 py-16">
				<div className="w-full max-w-sm space-y-8">
					<div>
						<h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
							Sign in
						</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							Enter your email to continue.
						</p>
					</div>
					<LoginForm redirectTo={search.redirect} />
				</div>
			</div>
		</div>
	);
}
