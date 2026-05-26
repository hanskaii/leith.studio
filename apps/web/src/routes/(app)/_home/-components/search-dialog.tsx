import { useContext, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from "@workspace/ui";
import { ModalContext } from "@/routes/-components/providers/modal-provider";
import { tagsQueryOptions } from "@/routes/-fn/tags";
import {
	searchPostsQueryOptions,
	useDebouncedValue
} from "@/routes/-fn/search";

export function SearchDialog() {
	const { searchOpen, closeSearch } = useContext(ModalContext);
	const navigate = useNavigate();

	const [input, setInput] = useState("");
	const debouncedQ = useDebouncedValue(input.trim(), 250);

	const { data: searchData, isFetching } = useQuery(
		searchPostsQueryOptions(debouncedQ)
	);
	const { data: tagData } = useQuery(tagsQueryOptions());
	const tagList = tagData ?? [];

	const results = searchData?.items ?? [];
	const showTags = debouncedQ.length <= 1;

	const handlePostSelect = (slug: string) => {
		closeSearch();
		setInput("");
		navigate({ to: "/feed/$slug", params: { slug } });
	};

	const handleTagSelect = (slug: string) => {
		closeSearch();
		setInput("");
		navigate({
			to: "/feed",
			search: { page: 1, tag: slug, type: "all", sort: "newest" }
		});
	};

	return (
		<CommandDialog
			open={searchOpen}
			onOpenChange={(open) => !open && closeSearch()}
			// Server returns AI Search ranked results — cmdk's built-in
			// substring filter would re-rank or hide them, which we don't want.
			shouldFilter={false}
		>
			<CommandInput
				placeholder="Search by vibe… moody rain, golden warmth"
				value={input}
				onValueChange={setInput}
			/>
			<CommandList>
				<CommandEmpty>
					{debouncedQ.length > 1
						? isFetching
							? "Searching…"
							: `No matches for "${debouncedQ}".`
						: "Type to search, or pick a tag below."}
				</CommandEmpty>

				{results.length > 0 && (
					<CommandGroup
						heading="Results"
						className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:uppercase"
					>
						{results.slice(0, 8).map((post) => {
							const primaryTag = post.tags?.[0];
							const src = post.thumbUrl ?? post.coverUrl ?? null;
							return (
								<CommandItem
									key={post.id}
									value={post.slug}
									onSelect={() => handlePostSelect(post.slug)}
									className="cursor-pointer gap-3"
								>
									{src ? (
										<img
											src={src}
											alt=""
											className="h-8 w-12 rounded object-cover"
										/>
									) : (
										<div className="h-8 w-12 rounded bg-muted" />
									)}
									<span className="truncate">
										{post.title}
									</span>
									{primaryTag && (
										<span className="ml-auto text-xs text-muted-foreground">
											{primaryTag.name}
										</span>
									)}
								</CommandItem>
							);
						})}
					</CommandGroup>
				)}

				{showTags && tagList.length > 0 && (
					<CommandGroup
						heading="Browse by tag"
						className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:uppercase"
					>
						{tagList.map((tag) => (
							<CommandItem
								key={tag.slug}
								value={tag.name}
								onSelect={() => handleTagSelect(tag.slug)}
								className="cursor-pointer"
							>
								{tag.name}
							</CommandItem>
						))}
					</CommandGroup>
				)}
			</CommandList>
		</CommandDialog>
	);
}
