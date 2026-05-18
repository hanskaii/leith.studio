import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";

const COOKIE_NAME = "chat-room-id";

export const getChatRoomIdFromCookie = createServerFn({
	method: "GET"
}).handler(async () => {
	let roomId = getCookie(COOKIE_NAME);
	if (!roomId) {
		roomId = crypto.randomUUID();
		setCookie(COOKIE_NAME, roomId, {
			httpOnly: false,
			path: "/",
			maxAge: 60 * 60 * 24 * 365,
			sameSite: "lax"
		});
	}
	return roomId;
});
