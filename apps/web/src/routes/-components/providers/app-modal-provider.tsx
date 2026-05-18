"use client";

import type { ReactNode } from "react";
import {
	createContext,
	memo,
	useCallback,
	useMemo,
	useState,
	useRef
} from "react";
import { ConfirmModal, type ConfirmOptions } from "../modals/confirm-modal";
import { CreateApiKeyModal } from "../modals/create-api-key-modal";
import { ShowApiKeyModal } from "../modals/show-api-key-modal";

export const AppModalContext = createContext<{
	openConfirmModal: (options: ConfirmOptions, onConfirm: () => void) => void;
	openSessionsModal: () => void;
	openCreateApiKeyModal: (onCreated: (key: string) => void) => void;
	openShowApiKeyModal: (key: string) => void;
}>({
	openConfirmModal: () => {},
	openSessionsModal: () => {},
	openCreateApiKeyModal: () => {},
	openShowApiKeyModal: () => {}
});

export function AppModalProvider({ children }: { children: ReactNode }) {
	return <AppModalProviderClient>{children}</AppModalProviderClient>;
}

const AppModalProviderClient = memo(function AppModalProviderClient({
	children
}: {
	children: ReactNode;
}) {
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions>({
		title: "",
		description: ""
	});
	const confirmCallbackRef = useRef<(() => void) | null>(null);

	const [createApiKeyOpen, setCreateApiKeyOpen] = useState(false);
	const createApiKeyCallbackRef = useRef<((key: string) => void) | null>(
		null
	);

	const [showApiKeyOpen, setShowApiKeyOpen] = useState(false);
	const [apiKeyToShow, setApiKeyToShow] = useState("");

	const handleConfirm = useCallback(() => {
		setConfirmOpen(false);
		confirmCallbackRef.current?.();
		confirmCallbackRef.current = null;
	}, []);

	const handleCancelConfirm = useCallback(() => {
		setConfirmOpen(false);
		confirmCallbackRef.current = null;
	}, []);

	const openConfirmModal = useCallback(
		(options: ConfirmOptions, onConfirm: () => void) => {
			setConfirmOptions(options);
			confirmCallbackRef.current = onConfirm;
			setConfirmOpen(true);
		},
		[]
	);

	const openSessionsModal = useCallback(() => {
		// Placeholder for sessions modal
	}, []);

	const openCreateApiKeyModal = useCallback(
		(onCreated: (key: string) => void) => {
			createApiKeyCallbackRef.current = onCreated;
			setCreateApiKeyOpen(true);
		},
		[]
	);

	const openShowApiKeyModal = useCallback((key: string) => {
		setApiKeyToShow(key);
		setShowApiKeyOpen(true);
	}, []);

	const contextValue = useMemo(
		() => ({
			openConfirmModal,
			openSessionsModal,
			openCreateApiKeyModal,
			openShowApiKeyModal
		}),
		[
			openConfirmModal,
			openSessionsModal,
			openCreateApiKeyModal,
			openShowApiKeyModal
		]
	);

	return (
		<AppModalContext.Provider value={contextValue}>
			{children}
			<ConfirmModal
				showModal={confirmOpen}
				setShowModal={setConfirmOpen}
				options={confirmOptions}
				onConfirm={handleConfirm}
				onCancel={handleCancelConfirm}
			/>
			<CreateApiKeyModal
				showModal={createApiKeyOpen}
				setShowModal={setCreateApiKeyOpen}
				onCreated={(key) => {
					createApiKeyCallbackRef.current?.(key);
					createApiKeyCallbackRef.current = null;
				}}
			/>
			<ShowApiKeyModal
				apiKey={apiKeyToShow}
				showModal={showApiKeyOpen}
				setShowModal={setShowApiKeyOpen}
			/>
		</AppModalContext.Provider>
	);
});
