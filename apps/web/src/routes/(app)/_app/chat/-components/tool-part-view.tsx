import { isToolUIPart, getToolName } from "ai";
import type { UIMessage } from "ai";
import { Button, Card, CardHeader, CardContent, Badge } from "@workspace/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	Settings01Icon,
	Tick01Icon,
	Cancel01Icon
} from "@hugeicons/core-free-icons";
import { cn } from "@workspace/ui/lib/cn";
import React from "react";

export function ToolPartView({
	part,
	addToolApprovalResponse
}: {
	part: UIMessage["parts"][number];
	addToolApprovalResponse: (response: {
		id: string;
		approved: boolean;
	}) => void;
}) {
	if (!isToolUIPart(part)) return null;
	const toolName = getToolName(part);

	const Container = ({
		children,
		className
	}: {
		children: React.ReactNode;
		className?: string;
	}) => (
		<div className="flex justify-start w-full my-2">
			<Card
				className={cn(
					"max-w-[85%] bg-card/60 backdrop-blur-sm overflow-hidden p-0 gap-0",
					className
				)}
			>
				{children}
			</Card>
		</div>
	);

	// Completed
	if (part.state === "output-available") {
		return (
			<Container className="border-border/50">
				<CardHeader className="flex flex-row items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border/30 space-y-0 h-auto">
					<HugeiconsIcon
						icon={Settings01Icon}
						className="size-3.5 text-muted-foreground"
					/>
					<span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
						{toolName}
					</span>
					<Badge
						variant="secondary"
						className="ml-auto bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 px-1.5 py-0"
					>
						<div className="size-1.5 rounded-full bg-emerald-500 mr-1.5" />
						<span className="text-[9px] uppercase tracking-wider font-bold">
							Synced
						</span>
					</Badge>
				</CardHeader>
				<CardContent className="p-2 bg-muted/10">
					<pre className="text-[10px] font-mono text-muted-foreground/80 whitespace-pre-wrap leading-tight max-h-32 overflow-y-auto">
						{JSON.stringify(part.output, null, 2)}
					</pre>
				</CardContent>
			</Container>
		);
	}

	// Needs approval
	if ("approval" in part && part.state === "approval-requested") {
		const approvalId = (part.approval as { id?: string })?.id;
		return (
			<Container className="border-amber-500/30 bg-amber-500/5">
				<CardHeader className="flex flex-row items-center gap-2 px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 space-y-0 h-auto">
					<HugeiconsIcon
						icon={Settings01Icon}
						className="size-4 text-amber-500"
					/>
					<span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
						Action Required: {toolName}
					</span>
					<Badge
						variant="secondary"
						className="ml-auto bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/30 border-amber-500/30 px-1.5 py-0"
					>
						<div className="size-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
						<span className="text-[9px] uppercase tracking-wider font-bold">
							Pending
						</span>
					</Badge>
				</CardHeader>
				<CardContent className="p-3">
					<div className="bg-background/50 rounded-lg p-2 mb-3 border border-amber-500/10">
						<pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap leading-tight">
							{JSON.stringify(part.input, null, 2)}
						</pre>
					</div>
					<div className="flex gap-2">
						<Button
							variant="default"
							size="xs"
							className="bg-amber-500 hover:bg-amber-600 text-white border-none h-7"
							onClick={() => {
								if (approvalId) {
									addToolApprovalResponse({
										id: approvalId,
										approved: true
									});
								}
							}}
						>
							<HugeiconsIcon
								icon={Tick01Icon}
								className="size-3 mr-1"
							/>
							Approve
						</Button>
						<Button
							variant="outline"
							size="xs"
							className="h-7 border-amber-500/20 bg-transparent hover:bg-amber-500/10"
							onClick={() => {
								if (approvalId) {
									addToolApprovalResponse({
										id: approvalId,
										approved: false
									});
								}
							}}
						>
							<HugeiconsIcon
								icon={Cancel01Icon}
								className="size-3 mr-1"
							/>
							Reject
						</Button>
					</div>
				</CardContent>
			</Container>
		);
	}

	// Rejected / denied
	if (
		part.state === "output-denied" ||
		("approval" in part &&
			(part.approval as { approved?: boolean })?.approved === false)
	) {
		return (
			<Container className="border-destructive/20 bg-destructive/5 opacity-80 ring-1 ring-destructive/10">
				<CardHeader className="flex flex-row items-center gap-2 px-3 py-1.5 border-b border-destructive/10 space-y-0 h-auto">
					<HugeiconsIcon
						icon={Cancel01Icon}
						className="size-3.5 text-destructive"
					/>
					<span className="text-[10px] font-medium text-destructive/80 uppercase tracking-wider">
						{toolName}
					</span>
					<Badge
						variant="destructive"
						className="ml-auto bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 px-1.5 py-0"
					>
						<span className="text-[9px] uppercase tracking-wider font-bold">
							Rejected
						</span>
					</Badge>
				</CardHeader>
			</Container>
		);
	}

	// Executing
	if (part.state === "input-available" || part.state === "input-streaming") {
		return (
			<Container className="border-border/30 border-dashed">
				<CardHeader className="flex flex-row items-center gap-2 px-3 py-2 space-y-0 h-auto">
					<div className="relative flex items-center justify-center">
						<HugeiconsIcon
							icon={Settings01Icon}
							className="size-3.5 text-primary animate-spin"
						/>
					</div>
					<span className="text-[11px] font-medium text-muted-foreground">
						Agent is using{" "}
						<span className="text-foreground tracking-tight underline decoration-primary/30 underline-offset-2">
							{toolName}
						</span>
						...
					</span>
					<Badge
						variant="secondary"
						className="ml-auto bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 px-1.5 py-0"
					>
						<div className="size-1.5 rounded-full bg-primary mr-1.5 animate-pulse" />
						<span className="text-[9px] uppercase tracking-wider font-bold">
							Executing
						</span>
					</Badge>
				</CardHeader>
			</Container>
		);
	}

	return null;
}
