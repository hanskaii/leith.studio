import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { buttonVariants } from "@workspace/ui";
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
			{ title: "Login - workspacen.in" },
			{
				name: "description",
				content: "Sign in to your workspacen.in account."
			}
		]
	})
});

function LoginPage() {
	const search = useSearch({ from: "/(app)/_auth/login" });

	return (
		<div className="relative w-full md:h-screen md:overflow-hidden">
			<div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4">
				<Link
					to="/"
					className={`${buttonVariants({ variant: "ghost" })} absolute top-4 left-4`}
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} />
					Home
				</Link>

				<div className="absolute top-4 right-4">
					<ThemeToggle />
				</div>

				<div className="mx-auto space-y-4 sm:w-sm ">
					<div className="flex flex-col space-y-1">
						<h1 className="font-bold text-2xl tracking-wide">
							Sign In or Join Now!
						</h1>
						<p className="text-base text-muted-foreground">
							login or create your account.
						</p>
					</div>
					<LoginForm redirectTo={search.redirect} />
				</div>
			</div>
		</div>
	);
}
