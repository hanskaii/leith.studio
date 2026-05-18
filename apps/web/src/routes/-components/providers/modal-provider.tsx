"use client";

import type { ReactNode } from "react";
import { createContext } from "react";

export const ModalContext = createContext({});

export function ModalProvider({ children }: { children: ReactNode }) {
	return <ModalContext.Provider value={{}}>{children}</ModalContext.Provider>;
}
