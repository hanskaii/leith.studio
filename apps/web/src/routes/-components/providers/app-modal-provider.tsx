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
import { TopicFormModal } from "../modals/topic-form-modal";
import type { StudioTopic } from "@/routes/-fn/studio";

export const AppModalContext = createContext<{
	openConfirmModal: (options: ConfirmOptions, onConfirm: () => void) => void;
	openSessionsModal: () => void;
	openCreateApiKeyModal: (onCreated: (key: string) => void) => void;
	openShowApiKeyModal: (key: string) => void;
	openTopicModal: (topic?: StudioTopic | null) => void;
}>({
	openConfirmModal: () => {},
	openSessionsModal: () => {},
	openCreateApiKeyModal: () => {},
	openShowApiKeyModal: () => {},
	openTopicModal: () => {}
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

	const [topicModalOpen, setTopicModalOpen] = useState(false);
	const [topicToEdit, setTopicToEdit] = useState<StudioTopic | null>(null);

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

	const openTopicModal = useCallback((topic?: StudioTopic | null) => {
		setTopicToEdit(topic ?? null);
		setTopicModalOpen(true);
	}, []);

	const contextValue = useMemo(
		() => ({
			openConfirmModal,
			openSessionsModal,
			openCreateApiKeyModal,
			openShowApiKeyModal,
			openTopicModal
		}),
		[
			openConfirmModal,
			openSessionsModal,
			openCreateApiKeyModal,
			openShowApiKeyModal,
			openTopicModal
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
			<TopicFormModal
				topic={topicToEdit}
				showModal={topicModalOpen}
				setShowModal={setTopicModalOpen}
			/>
		</AppModalContext.Provider>
	);
});
