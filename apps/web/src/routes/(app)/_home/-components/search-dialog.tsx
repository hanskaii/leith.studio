import { useContext } from "react";
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

export function SearchDialog() {
	const { searchOpen, closeSearch } = useContext(ModalContext);
	const navigate = useNavigate();
	// Plain useQuery (not Suspense) — the command dialog mounts at the root
	// shell so we cannot afford a Suspense boundary throwing here.
	const { data } = useQuery(tagsQueryOptions());
	const tagList = data ?? [];

	const handleSelect = (slug: string) => {
		closeSearch();
		navigate({
			to: "/feed",
			search: { page: 1, tag: slug, type: "all", sort: "newest" }
		});
	};

	return (
		<CommandDialog
			open={searchOpen}
			onOpenChange={(open) => !open && closeSearch()}
		>
			<CommandInput placeholder="Search by vibe... loop, overlay, transition" />
			<CommandList>
				<CommandEmpty>No results found.</CommandEmpty>
				<CommandGroup
					heading="Browse by tag"
					className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:uppercase"
				>
					{tagList.map((tag) => (
						<CommandItem
							key={tag.slug}
							value={tag.name}
							onSelect={() => handleSelect(tag.slug)}
							className="cursor-pointer"
						>
							{tag.name}
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
}
