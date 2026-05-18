import { ChartContainer, type ChartConfig } from "@workspace/ui";
import { Area, AreaChart } from "recharts";
import { useMemo } from "react";

export function Sparkline({
	data,
	color = "#6366f1"
}: {
	data: number[];
	color?: string;
}) {
	const chartData = useMemo(() => {
		return data.map((value, i) => ({
			index: i,
			value
		}));
	}, [data]);

	const chartConfig = {
		value: {
			label: "Value",
			color: color
		}
	} satisfies ChartConfig;

	if (!data.length) return null;

	return (
		<ChartContainer config={chartConfig} className="h-10 w-full">
			<AreaChart
				data={chartData}
				margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
			>
				<defs>
					<linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
						<stop
							offset="5%"
							stopColor="var(--color-value)"
							stopOpacity={0.3}
						/>
						<stop
							offset="95%"
							stopColor="var(--color-value)"
							stopOpacity={0}
						/>
					</linearGradient>
				</defs>
				<Area
					dataKey="value"
					type="monotone"
					fill="url(#fillValue)"
					fillOpacity={0.4}
					stroke="var(--color-value)"
					strokeWidth={2}
				/>
			</AreaChart>
		</ChartContainer>
	);
}
