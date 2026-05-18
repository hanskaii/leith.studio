import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Drawer } from "vaul";
import { useRouter } from "@tanstack/react-router";
import { useMediaQuery } from "../hooks/use-media-query";
import { cn } from "../lib/cn";

interface ModalProps {
	children: React.ReactNode;
	className?: string;
	showModal?: boolean;
	setShowModal?: React.Dispatch<React.SetStateAction<boolean>>;
	onClose?: () => void;
	desktopOnly?: boolean;
	preventDefaultClose?: boolean;
	backdropClassName?: string;
	zIndex?: number;
}

export function Modal({
	children,
	className,
	showModal,
	setShowModal,
	onClose,
	desktopOnly,
	preventDefaultClose,
	backdropClassName,
	zIndex = 50
}: ModalProps) {
	const router = useRouter();
	const { isMobile } = useMediaQuery();
	const [internalOpen, setInternalOpen] = React.useState(showModal ?? true);

	React.useEffect(() => {
		if (showModal !== undefined) {
			setInternalOpen(showModal);
		}
	}, [showModal]);

	const handleClose = React.useCallback(
		(dragged = false) => {
			if (preventDefaultClose && !dragged) return;

			setInternalOpen(false);
			onClose?.();

			if (setShowModal) {
				setShowModal(false);
			} else {
				router.history.back();
			}
		},
		[preventDefaultClose, onClose, setShowModal, router]
	);

	const onOpenChange = React.useCallback(
		(open: boolean) => {
			if (!open) handleClose();
		},
		[handleClose]
	);

	if (showModal === false) return null;

	// --- Mobile: Drawer (vaul) ---
	if (isMobile && !desktopOnly) {
		return (
			<Drawer.Root
				open={internalOpen}
				onOpenChange={onOpenChange}
				direction="bottom"
			>
				<Drawer.Portal>
					<Drawer.Overlay
						className={cn(
							"fixed inset-0 bg-black/80 supports-backdrop-filter:backdrop-blur-xs",
							backdropClassName
						)}
						style={{ zIndex }}
					/>
					<Drawer.Content
						className={cn(
							"fixed inset-x-0 bottom-0 mt-24 flex h-auto max-h-[80vh] flex-col rounded-t-2xl bg-background p-4",
							className
						)}
						style={{ zIndex: zIndex + 1 }}
					>
						<Drawer.Title className="sr-only">Modal</Drawer.Title>
						<div className="mx-auto mb-4 h-1.5 w-[100px] shrink-0 rounded-full bg-muted" />
						<div className="flex-1 overflow-y-auto px-4 pb-4">
							{children}
						</div>
					</Drawer.Content>
				</Drawer.Portal>
			</Drawer.Root>
		);
	}

	// --- Desktop: Dialog ---
	return (
		<DialogPrimitive.Root open={internalOpen} onOpenChange={onOpenChange}>
			<DialogPrimitive.Portal>
				<DialogPrimitive.Overlay
					onClick={() => handleClose()}
					className={cn(
						"fixed inset-0 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-100",
						backdropClassName
					)}
					style={{ zIndex }}
				/>
				<DialogPrimitive.Content
					onPointerDownOutside={(e) => {
						// Don't close on toast clicks
						if (
							e.target instanceof Element &&
							e.target.closest("[data-sonner-toast]")
						) {
							e.preventDefault();
							return;
						}
						handleClose();
					}}
					className={cn(
						"fixed left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-background shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-100",
						className
					)}
					style={{ zIndex: zIndex + 1 }}
				>
					{children}
				</DialogPrimitive.Content>
			</DialogPrimitive.Portal>
		</DialogPrimitive.Root>
	);
}

export function ModalHeader({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"flex flex-col space-y-1.5 text-center sm:text-left",
				className
			)}
			{...props}
		/>
	);
}

export function ModalFooter({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				"flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
				className
			)}
			{...props}
		/>
	);
}

export function ModalTitle({
	className,
	...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
	return (
		<DialogPrimitive.Title
			className={cn(
				"font-semibold text-lg leading-none tracking-tight",
				className
			)}
			{...props}
		/>
	);
}

export function ModalDescription({
	className,
	...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
	return (
		<p
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

export function ModalClose({
	className,
	...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<DialogPrimitive.Close
			className={cn(
				"absolute top-4 right-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none",
				className
			)}
			{...props}
		/>
	);
}
