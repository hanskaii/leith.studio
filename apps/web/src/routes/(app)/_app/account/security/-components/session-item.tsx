import {
	Button,
	Badge,
	Field,
	FieldLabel,
	FieldDescription
} from "@workspace/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { Day } from "@workspace/core";
import { getDeviceIcon, getDeviceName, getOSVersion } from "./device-utils";

export function SessionItem({
	sessionItem,
	currentSessionToken,
	revokeSessionMutation
}: {
	sessionItem: any;
	currentSessionToken?: string;
	revokeSessionMutation: any;
}) {
	const isCurrent = sessionItem.token === currentSessionToken;
	const form = useForm({
		defaultValues: { token: sessionItem.token },
		onSubmit: async ({ value }) => {
			await revokeSessionMutation.mutateAsync(value.token);
		}
	});

	const osVersion = getOSVersion(sessionItem.userAgent || "");
	const deviceName = getDeviceName(sessionItem.userAgent || "");
	const fullDeviceName = osVersion
		? `${osVersion} ${deviceName}`
		: deviceName;

	const d = Day(sessionItem.createdAt);
	const formattedDate = d.format("L");
	const formattedTime = d.format("LT");
	const location = sessionItem.ipAddress || "Unknown Location";

	return (
		<Field
			orientation="horizontal"
			className="rounded-xl border border-border p-4 bg-muted/20 items-center"
		>
			<div className="flex items-center gap-3 flex-1 pr-4">
				<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-foreground/10">
					<HugeiconsIcon
						icon={getDeviceIcon(sessionItem.userAgent || "")}
						className="h-5 w-5"
					/>
				</div>
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<FieldLabel className="text-sm font-semibold text-foreground m-0 p-0 leading-tight">
							{fullDeviceName}
						</FieldLabel>
						{isCurrent && (
							<Badge
								variant="secondary"
								className="bg-green-100 text-green-700 border-0 h-5 px-1.5 text-[10px] font-bold"
							>
								SAAT INI
							</Badge>
						)}
					</div>
					<FieldDescription className="text-xs text-muted-foreground leading-relaxed">
						Last logged in on {formattedDate} at {formattedTime}{" "}
						from {location}
					</FieldDescription>
				</div>
			</div>
			<div className="flex items-center gap-2">
				{!isCurrent && (
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
					>
						<form.Subscribe
							selector={(state) => [state.isSubmitting]}
						>
							{([isSubmitting]) => (
								<Button
									type="submit"
									variant="outline"
									disabled={isSubmitting}
								>
									{isSubmitting ? "Mencabut..." : "Cabut"}
								</Button>
							)}
						</form.Subscribe>
					</form>
				)}
			</div>
		</Field>
	);
}
