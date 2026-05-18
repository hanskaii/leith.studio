"use client";

import {
	Button,
	Modal,
	ModalHeader,
	ModalTitle,
	ModalDescription,
	ModalFooter,
	toast
} from "@workspace/ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon } from "@hugeicons/core-free-icons";

export function ShowApiKeyModal({
	apiKey,
	showModal,
	setShowModal
}: {
	apiKey: string;
	showModal: boolean;
	setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
}) {
	const copyToClipboard = () => {
		navigator.clipboard.writeText(apiKey);
		toast.success("API Key copied to clipboard");
	};

	return (
		<Modal
			showModal={showModal}
			setShowModal={setShowModal}
			className="p-6"
		>
			<div className="flex flex-col gap-6">
				<ModalHeader>
					<ModalTitle>API Key Created</ModalTitle>
					<ModalDescription>
						Make sure to copy your API key now. You won't be able to
						see it again.
					</ModalDescription>
				</ModalHeader>

				<div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3 font-mono text-sm break-all">
					<span className="flex-1 text-foreground">{apiKey}</span>
					<Button
						variant="ghost"
						size="icon"
						onClick={copyToClipboard}
						className="shrink-0"
					>
						<HugeiconsIcon icon={Copy01Icon} className="size-4" />
					</Button>
				</div>

				<ModalFooter>
					<Button onClick={() => setShowModal(false)}>Got it</Button>
				</ModalFooter>
			</div>
		</Modal>
	);
}
