import { createContext, useContext, useEffect, useState } from "react";
import { updateThemeCookie } from "@/routes/-fn/theme";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
	children: React.ReactNode;
	initialTheme: Theme;
};

type ThemeProviderState = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

const ThemeProviderContext = createContext<ThemeProviderState>({
	theme: "system",
	setTheme: () => null
});

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
	const [theme, setThemeState] = useState<Theme>(initialTheme);

	useEffect(() => {
		const root = window.document.documentElement;
		root.classList.remove("light", "dark");

		if (theme === "system") {
			const systemTheme = window.matchMedia(
				"(prefers-color-scheme: dark)"
			).matches
				? "dark"
				: "light";
			root.classList.add(systemTheme);
			return;
		}

		root.classList.add(theme);
	}, [theme]);

	const setTheme = (newTheme: Theme) => {
		setThemeState(newTheme);

		updateThemeCookie({ data: newTheme });
	};

	return (
		<ThemeProviderContext.Provider value={{ theme, setTheme }}>
			{children}
		</ThemeProviderContext.Provider>
	);
}

export const useTheme = () => {
	const context = useContext(ThemeProviderContext);
	if (!context)
		throw new Error("useTheme must be used within a ThemeProvider");
	return context;
};

export function ThemeScript({ initialTheme }: { initialTheme: Theme }) {
	// Script ini string JS murni yang akan dieksekusi browser SEGERA
	// Variabel 'initialTheme' dimasukkan langsung ke dalam string script
	const scriptContent = `
    (function() {
      try {
        var theme = '${initialTheme}';
        var root = document.documentElement;

        root.classList.remove('light', 'dark');

        if (theme === 'system') {
          var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (isDark) {
            root.classList.add('dark');
          } else {
            root.classList.add('light');
          }
        } else {
          // Jika explicit 'dark' atau 'light' dari cookie
          root.classList.add(theme);
        }
      } catch (e) {}
    })();
  `;

	// dangerouslySetInnerHTML memastikan script masuk sebagai raw HTML
	// biome-ignore lint/security/noDangerouslySetInnerHtml: theme script needs to be inline
	return <script dangerouslySetInnerHTML={{ __html: scriptContent }} />;
}
