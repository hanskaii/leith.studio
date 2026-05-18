import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";

type Theme = "dark" | "light" | "system";

const COOKIE_NAME = "app-theme";

export const getThemeFromCookie = createServerFn({ method: "GET" }).handler(
	async () => {
		const theme = getCookie(COOKIE_NAME);
		return (theme as Theme) || "system";
	}
);

export const updateThemeCookie = createServerFn({ method: "POST" })
	.inputValidator((theme: Theme) => theme)
	.handler(async ({ data: theme }) => {
		setCookie(COOKIE_NAME, theme, {
			httpOnly: false,
			path: "/",
			maxAge: 60 * 60 * 24 * 365,
			sameSite: "lax"
		});
		return theme;
	});
