import { useContext } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from "@workspace/ui";
import { ModalContext } from "@/routes/-components/providers/modal-provider";
import { FEED_TAGS } from "../feed/-lib/feed-data";

export function SearchDialog() {
	const { searchOpen, closeSearch } = useContext(ModalContext);
	const navigate = useNavigate();

	const handleSelect = (tag: string) => {
		closeSearch();
		navigate({
			to: "/feed",
			search: { page: 1, tag, type: "all", sort: "newest" }
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
					{FEED_TAGS.map((tag) => (
						<CommandItem
							key={tag}
							value={tag}
							onSelect={() => handleSelect(tag)}
							className="cursor-pointer"
						>
							{tag}
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</CommandDialog>
	);
}
