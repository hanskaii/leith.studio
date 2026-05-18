import { fileURLToPath, URL } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url))
		},
		dedupe: [
			"react",
			"react-dom",
			"@tanstack/react-router",
			"@tanstack/react-query"
		]
	},
	plugins: [
		devtools({
			eventBusConfig: {
				port: 42069
			}
		}),
		cloudflare({
			viteEnvironment: { name: "ssr" },
			persistState: {
				path: "../../.wrangler/state"
			},
			inspectorPort: 9231
		}),
		// this is the plugin that enables path aliases
		viteTsConfigPaths({
			projects: ["./tsconfig.json"]
		}),
		tailwindcss(),
		tanstackStart(),
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"]
			}
		})
	],
	build: {},
	server: {
		port: 5173,
		proxy: {
			"/api": {
				target: process.env.VITE_API_URL,
				changeOrigin: true,
				ws: true,
				rewrite: (path) => path.replace(/^\/api/, "")
			},
			"/agents": {
				target: process.env.VITE_API_URL,
				changeOrigin: true,
				ws: true
			}
		}
	}
});

export default config;
