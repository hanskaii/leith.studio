import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@workspace/ui";
import { useTheme } from "@/routes/-components/providers/theme-provider";
import { cn } from "@workspace/ui/lib/cn";

export function ThemeToggle({ className }: { className?: string }) {
	const { theme, setTheme } = useTheme();

	const toggleTheme = () => {
		setTheme(theme === "light" ? "dark" : "light");
	};

	return (
		<Button
			variant="outline"
			size="icon"
			onClick={toggleTheme}
			suppressHydrationWarning
			className={cn(
				"size-7 rounded-lg border-border bg-background px-2 py-1.5 transition-colors hover:bg-accent hover:text-accent-foreground",
				className
			)}
		>
			<HugeiconsIcon
				icon={Sun03Icon}
				className="dark:-rotate-90 h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:scale-0"
			/>
			<HugeiconsIcon
				icon={Moon02Icon}
				className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
			/>
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
