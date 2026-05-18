import {
	Button,
	Modal,
	ModalHeader,
	ModalTitle,
	ModalDescription,
	ModalFooter
} from "@workspace/ui";

export interface ConfirmOptions {
	title: string;
	description: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: "destructive" | "default";
}

import * as React from "react";

interface ConfirmModalProps {
	showModal: boolean;
	setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
	options: ConfirmOptions;
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmModal({
	showModal,
	setShowModal,
	options,
	onConfirm,
	onCancel
}: ConfirmModalProps) {
	return (
		<Modal
			showModal={showModal}
			setShowModal={setShowModal}
			className="max-w-sm p-6"
		>
			<div className="flex flex-col gap-6">
				<ModalHeader>
					<ModalTitle>{options.title}</ModalTitle>
					{options.description && (
						<ModalDescription>
							{options.description}
						</ModalDescription>
					)}
				</ModalHeader>
				<ModalFooter className="gap-2 sm:gap-2">
					<Button variant="ghost" onClick={onCancel}>
						{options.cancelLabel ?? "Cancel"}
					</Button>
					<Button
						variant={options.variant ?? "default"}
						onClick={onConfirm}
					>
						{options.confirmLabel ?? "Confirm"}
					</Button>
				</ModalFooter>
			</div>
		</Modal>
	);
}
