import { createFileRoute } from "@tanstack/react-router";
import {
	useSuspenseQuery,
	useMutation,
	useQueryClient
} from "@tanstack/react-query";
import { authClient } from "@/auth/client";
import { useState, useMemo, Suspense } from "react";
import {
	flexRender,
	getCoreRowModel,
	useReactTable,
	createColumnHelper
} from "@tanstack/react-table";
import {
	Button,
	toast,
	Badge,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from "@workspace/ui";
import {
	UserMultiple02Icon,
	Delete01Icon,
	Shield01Icon,
	Cancel01Icon,
	CheckmarkCircle01Icon,
	MoreVerticalIcon,
	ArrowLeft01Icon,
	ArrowRight01Icon
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Day } from "@workspace/core";
import { UserFilters } from "./-components/user-filters";
import { TableSkeleton } from "./-components/table-skeleton";

export const Route = createFileRoute("/(app)/_admin/s/users/")({
	component: AdminUsersPage
});

type User = {
	id: string;
	name: string;
	email: string;
	role?: string;
	banned?: boolean;
	banReason?: string;
	createdAt: string | Date;
	image?: string | null;
	emailVerified?: boolean;
};

const PAGE_SIZE = 20;

const columnHelper = createColumnHelper<User>();

function AdminUsersPage() {
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">(
		"all"
	);
	const [statusFilter, setStatusFilter] = useState<
		"all" | "banned" | "active"
	>("all");

	return (
		<div className="flex flex-col gap-0 min-h-screen">
			{/* Header placeholder — total count rendered inside Suspense */}
			<div className="px-6 pt-8 pb-5 flex items-start justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Users</h1>
				</div>
			</div>

			{/* Filters */}
			<UserFilters
				search={search}
				onSearchChange={(v) => {
					setSearch(v);
					setPage(1);
				}}
				roleFilter={roleFilter}
				onRoleChange={setRoleFilter}
				statusFilter={statusFilter}
				onStatusChange={setStatusFilter}
			/>

			<Suspense
				fallback={
					<div className="px-6">
						<TableSkeleton />
					</div>
				}
			>
				<UsersContent
					page={page}
					search={search}
					roleFilter={roleFilter}
					statusFilter={statusFilter}
					onPageChange={setPage}
				/>
			</Suspense>
		</div>
	);
}

type UsersContentProps = {
	page: number;
	search: string;
	roleFilter: "all" | "admin" | "user";
	statusFilter: "all" | "banned" | "active";
	onPageChange: (updater: (p: number) => number) => void;
};

function UsersContent({
	page,
	search,
	roleFilter,
	statusFilter,
	onPageChange
}: UsersContentProps) {
	const qc = useQueryClient();

	const { data } = useSuspenseQuery({
		queryKey: ["admin", "users", page, search, roleFilter, statusFilter],
		queryFn: async () => {
			const { data, error } = await authClient.admin.listUsers({
				query: {
					limit: PAGE_SIZE,
					offset: (page - 1) * PAGE_SIZE,
					sortBy: "createdAt",
					sortDirection: "desc",
					...(search
						? {
								searchField: "email",
								searchValue: search,
								searchOperator: "contains"
							}
						: {})
				}
			});
			if (error) throw error;
			return data;
		}
	});

	const allUsers = useMemo(() => data.users as User[], [data]);
	const total = data.total ?? 0;
	const totalPages = Math.ceil(total / PAGE_SIZE);

	const filteredUsers = useMemo(() => {
		return allUsers.filter((u) => {
			if (roleFilter === "admin" && u.role !== "admin") return false;
			if (roleFilter === "user" && u.role === "admin") return false;
			if (statusFilter === "banned" && !u.banned) return false;
			if (statusFilter === "active" && u.banned) return false;
			return true;
		});
	}, [allUsers, roleFilter, statusFilter]);

	const setRoleMutation = useMutation({
		mutationFn: async ({
			userId,
			role
		}: {
			userId: string;
			role: string;
		}) => {
			const { error } = await authClient.admin.setRole({
				userId,
				role: role as any
			});
			if (error) throw error;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["admin", "users"] });
			toast.success("Role updated");
		},
		onError: (e: any) => toast.error(e.message || "Failed to update role")
	});

	const banMutation = useMutation({
		mutationFn: async ({
			userId,
			ban
		}: {
			userId: string;
			ban: boolean;
		}) => {
			if (ban) {
				const { error } = await authClient.admin.banUser({ userId });
				if (error) throw error;
			} else {
				const { error } = await authClient.admin.unbanUser({ userId });
				if (error) throw error;
			}
		},
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: ["admin", "users"] });
			toast.success(vars.ban ? "User banned" : "User unbanned");
		},
		onError: (e: any) => toast.error(e.message || "Failed")
	});

	const deleteMutation = useMutation({
		mutationFn: async (userId: string) => {
			const { error } = await authClient.admin.removeUser({ userId });
			if (error) throw error;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["admin", "users"] });
			toast.success("User deleted");
		},
		onError: (e: any) => toast.error(e.message || "Failed to delete user")
	});

	const columns = useMemo(
		() => [
			columnHelper.accessor("name", {
				header: "User",
				cell: (info) => (
					<div className="flex items-center gap-3 min-w-0">
						{info.row.original.image ? (
							<img
								src={info.row.original.image}
								className="size-7 rounded-full object-cover shrink-0"
								alt=""
							/>
						) : (
							<div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
								{info.getValue()?.charAt(0)?.toUpperCase() ??
									"?"}
							</div>
						)}
						<span className="text-xs font-medium truncate">
							{info.getValue() || "—"}
						</span>
					</div>
				)
			}),
			columnHelper.accessor("email", {
				header: "Email",
				cell: (info) => (
					<div className="flex items-center gap-1.5 min-w-0">
						<span className="text-xs text-muted-foreground truncate">
							{info.getValue()}
						</span>
						{info.row.original.emailVerified && (
							<HugeiconsIcon
								icon={CheckmarkCircle01Icon}
								className="size-3 text-emerald-500 shrink-0"
							/>
						)}
					</div>
				)
			}),
			columnHelper.accessor("createdAt", {
				header: "Joined",
				cell: (info) => (
					<span className="text-[11px] text-muted-foreground">
						{Day.timeAgo(info.getValue())}
					</span>
				)
			}),
			columnHelper.accessor("role", {
				header: "Role",
				cell: (info) =>
					info.getValue() === "admin" ? (
						<Badge
							variant="outline"
							className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20 font-semibold"
						>
							Admin
						</Badge>
					) : (
						<Badge
							variant="outline"
							className="text-[10px] text-muted-foreground font-medium"
						>
							User
						</Badge>
					)
			}),
			columnHelper.accessor("banned", {
				header: "Status",
				cell: (info) =>
					info.getValue() ? (
						<Badge
							variant="outline"
							className="text-[10px] bg-destructive/10 text-destructive border-destructive/20 font-semibold"
						>
							Banned
						</Badge>
					) : (
						<Badge
							variant="outline"
							className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 font-semibold"
						>
							Active
						</Badge>
					)
			}),
			columnHelper.display({
				id: "actions",
				cell: (info) => (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button className="size-7 flex items-center justify-center rounded-lg hover:bg-muted font-medium transition-colors">
								<HugeiconsIcon
									icon={MoreVerticalIcon}
									className="size-3.5 text-muted-foreground"
								/>
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-44">
							<DropdownMenuItem
								onSelect={() =>
									setRoleMutation.mutate({
										userId: info.row.original.id,
										role:
											info.row.original.role === "admin"
												? "user"
												: "admin"
									})
								}
							>
								<HugeiconsIcon
									icon={Shield01Icon}
									className="mr-2 size-3.5 text-amber-500"
								/>
								<span>
									{info.row.original.role === "admin"
										? "Remove admin"
										: "Make admin"}
								</span>
							</DropdownMenuItem>
							<DropdownMenuItem
								onSelect={() =>
									banMutation.mutate({
										userId: info.row.original.id,
										ban: !info.row.original.banned
									})
								}
							>
								<HugeiconsIcon
									icon={
										info.row.original.banned
											? CheckmarkCircle01Icon
											: Cancel01Icon
									}
									className={`mr-2 size-3.5 ${info.row.original.banned ? "text-emerald-500" : "text-yellow-500"}`}
								/>
								<span>
									{info.row.original.banned
										? "Unban user"
										: "Ban user"}
								</span>
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								className="text-destructive focus:text-destructive"
								onSelect={() => {
									if (
										confirm(
											`Delete ${info.row.original.email}? This cannot be undone.`
										)
									) {
										deleteMutation.mutate(
											info.row.original.id
										);
									}
								}}
							>
								<HugeiconsIcon
									icon={Delete01Icon}
									className="mr-2 size-3.5"
								/>
								<span>Delete user</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)
			})
		],
		[setRoleMutation, banMutation, deleteMutation]
	);

	const table = useReactTable({
		data: filteredUsers,
		columns,
		getCoreRowModel: getCoreRowModel()
	});

	return (
		<>
			<p className="px-6 pb-4 text-sm text-muted-foreground">
				{total} registered accounts
			</p>

			{/* Table */}
			<div className="px-6">
				<div className="rounded-xl border border-border overflow-hidden bg-card">
					{filteredUsers.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-2 py-20">
							<HugeiconsIcon
								icon={UserMultiple02Icon}
								className="size-8 text-muted-foreground/30"
							/>
							<p className="text-sm text-muted-foreground">
								No users found
							</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								{table.getHeaderGroups().map((headerGroup) => (
									<TableRow key={headerGroup.id}>
										{headerGroup.headers.map((header) => (
											<TableHead
												key={header.id}
												className="text-[11px] uppercase tracking-wider bg-muted/5"
											>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column
																.columnDef
																.header,
															header.getContext()
														)}
											</TableHead>
										))}
									</TableRow>
								))}
							</TableHeader>
							<TableBody>
								{table.getRowModel().rows.map((row) => (
									<TableRow key={row.id}>
										{row.getVisibleCells().map((cell) => (
											<TableCell key={cell.id}>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext()
												)}
											</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="flex items-center justify-between mt-4 pb-6">
						<span className="text-xs text-muted-foreground">
							Page {page} of {totalPages} · {total} users
						</span>
						<div className="flex items-center gap-1">
							<Button
								size="sm"
								variant="outline"
								className="h-8 px-3"
								disabled={page <= 1}
								onClick={() => onPageChange((p) => p - 1)}
							>
								<HugeiconsIcon
									icon={ArrowLeft01Icon}
									className="size-3.5"
								/>
							</Button>
							<Button
								size="sm"
								variant="outline"
								className="h-8 px-3"
								disabled={page >= totalPages}
								onClick={() => onPageChange((p) => p + 1)}
							>
								<HugeiconsIcon
									icon={ArrowRight01Icon}
									className="size-3.5"
								/>
							</Button>
						</div>
					</div>
				)}
			</div>
		</>
	);
}
