"use client";

import {
	createContext,
	memo,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode
} from "react";

interface ModalContextValue {
	searchOpen: boolean;
	openSearch: () => void;
	closeSearch: () => void;
}

export const ModalContext = createContext<ModalContextValue>({
	searchOpen: false,
	openSearch: () => {},
	closeSearch: () => {}
});

export function useModal() {
	return useContext(ModalContext);
}

export function ModalProvider({ children }: { children: ReactNode }) {
	return <ModalProviderClient>{children}</ModalProviderClient>;
}

const ModalProviderClient = memo(function ModalProviderClient({
	children
}: {
	children: ReactNode;
}) {
	const [searchOpen, setSearchOpen] = useState(false);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setSearchOpen((prev) => !prev);
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, []);

	const openSearch = useCallback(() => setSearchOpen(true), []);
	const closeSearch = useCallback(() => setSearchOpen(false), []);

	const value = useMemo(
		() => ({ searchOpen, openSearch, closeSearch }),
		[searchOpen, openSearch, closeSearch]
	);

	return (
		<ModalContext.Provider value={value}>{children}</ModalContext.Provider>
	);
});
