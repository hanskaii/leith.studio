import {
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig
} from "@workspace/ui";
import { Bar, BarChart, XAxis, CartesianGrid } from "recharts";
import { Calendar01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

type Props = {
	chartData: Array<{ day: string; count: number }>;
};

const chartConfig = {
	count: {
		label: "Signups",
		color: "hsl(var(--primary))"
	}
} satisfies ChartConfig;

export function SignupsChart({ chartData }: Props) {
	return (
		<div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<p className="text-sm font-semibold">Signups — Last 7 Days</p>
				<HugeiconsIcon
					icon={Calendar01Icon}
					className="size-4 text-muted-foreground"
				/>
			</div>
			<ChartContainer config={chartConfig} className="min-h-30 w-full">
				<BarChart data={chartData}>
					<CartesianGrid
						vertical={false}
						strokeDasharray="3 3"
						className="stroke-muted-foreground/10"
					/>
					<XAxis
						dataKey="day"
						tickLine={false}
						tickMargin={10}
						axisLine={false}
						tickFormatter={(value) => value[0]}
						className="text-[10px] fill-muted-foreground"
					/>
					<ChartTooltip
						cursor={false}
						content={<ChartTooltipContent hideLabel />}
					/>
					<Bar dataKey="count" fill="var(--color-count)" radius={4} />
				</BarChart>
			</ChartContainer>
		</div>
	);
}
