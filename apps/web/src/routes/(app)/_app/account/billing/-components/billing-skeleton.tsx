import { Skeleton } from "@workspace/ui";

export function PlanCardSkeleton() {
	return (
		<div className="rounded-xl border border-border bg-muted/10 p-5 flex items-center justify-between gap-4">
			<div className="flex items-center gap-4">
				<Skeleton className="size-10 rounded-xl shrink-0" />
				<div className="flex flex-col gap-2">
					<Skeleton className="h-3.5 w-28" />
					<Skeleton className="h-5 w-16 rounded-md" />
				</div>
			</div>
			<div className="flex items-center gap-2 shrink-0">
				<Skeleton className="h-8 w-28 rounded-lg" />
			</div>
		</div>
	);
}

function ListRowSkeleton() {
	return (
		<div className="flex items-center justify-between gap-3 px-4 py-3.5">
			<div className="flex items-center gap-3">
				<Skeleton className="size-7 rounded-lg shrink-0" />
				<div className="flex flex-col gap-1.5">
					<Skeleton className="h-3 w-36" />
					<Skeleton className="h-2.5 w-24" />
				</div>
			</div>
			<div className="flex items-center gap-3">
				<Skeleton className="h-3 w-14" />
				<Skeleton className="h-5 w-16 rounded-md" />
			</div>
		</div>
	);
}

export function SubscriptionsSkeleton({ rows = 2 }: { rows?: number }) {
	return (
		<div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
			{Array.from({ length: rows }).map((_, i) => (
				<ListRowSkeleton key={i} />
			))}
		</div>
	);
}

export function PaymentsSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="flex flex-col divide-y divide-border rounded-xl border border-border overflow-hidden">
			{Array.from({ length: rows }).map((_, i) => (
				<ListRowSkeleton key={i} />
			))}
		</div>
	);
}

export function BillingSkeleton() {
	return (
		<div className="flex flex-col gap-0 w-full mt-2 pb-16">
			{/* Current Plan */}
			<section className="flex flex-col gap-5 py-8">
				<div className="flex flex-col gap-1">
					<Skeleton className="h-3.5 w-24" />
					<Skeleton className="h-3 w-36" />
				</div>
				<PlanCardSkeleton />
			</section>

			<div className="h-px bg-border" />

			{/* Subscriptions */}
			<section className="flex flex-col gap-5 py-8">
				<div className="flex flex-col gap-1">
					<Skeleton className="h-3.5 w-28" />
					<Skeleton className="h-3 w-40" />
				</div>
				<SubscriptionsSkeleton rows={2} />
			</section>

			<div className="h-px bg-border" />

			{/* Payment History */}
			<section className="flex flex-col gap-5 py-8">
				<div className="flex items-end justify-between">
					<div className="flex flex-col gap-1">
						<Skeleton className="h-3.5 w-32" />
						<Skeleton className="h-3 w-44" />
					</div>
					<Skeleton className="h-7 w-16 rounded-lg" />
				</div>
				<PaymentsSkeleton rows={5} />
			</section>
		</div>
	);
}
