export { toast } from "sonner";

import {
	Alert02Icon,
	CheckmarkCircle02Icon,
	InformationCircleIcon,
	Loading03Icon,
	MultiplicationSignCircleIcon
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			theme={theme as ToasterProps["theme"]}
			className="toaster group"
			icons={{
				success: (
					<HugeiconsIcon
						icon={CheckmarkCircle02Icon}
						strokeWidth={2}
						className="size-4 text-emerald-500"
					/>
				),
				info: (
					<HugeiconsIcon
						icon={InformationCircleIcon}
						strokeWidth={2}
						className="size-4 text-blue-500"
					/>
				),
				warning: (
					<HugeiconsIcon
						icon={Alert02Icon}
						strokeWidth={2}
						className="size-4 text-amber-500"
					/>
				),
				error: (
					<HugeiconsIcon
						icon={MultiplicationSignCircleIcon}
						strokeWidth={2}
						className="size-4 text-destructive"
					/>
				),
				loading: (
					<HugeiconsIcon
						icon={Loading03Icon}
						strokeWidth={2}
						className="size-4 animate-spin text-muted-foreground"
					/>
				)
			}}
			style={
				{
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--border)",
					"--success-bg": "var(--popover)",
					"--success-text": "var(--popover-foreground)",
					"--success-border": "var(--border)",
					"--error-bg": "var(--popover)",
					"--error-text": "var(--popover-foreground)",
					"--error-border": "var(--border)",
					"--border-radius": "var(--radius)"
				} as React.CSSProperties
			}
			toastOptions={{
				classNames: {
					toast: "cn-toast gap-3 px-4 py-3 font-sans",
					icon: "mt-0.5 self-start shrink-0",
					title: "!text-sm !font-medium !leading-snug",
					description:
						"!text-xs !text-muted-foreground !leading-relaxed"
				}
			}}
			{...props}
		/>
	);
};

export { Toaster };
