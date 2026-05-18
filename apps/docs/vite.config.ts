import { fileURLToPath, URL } from "node:url";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";
import * as mdxConfig from "./source.config";
import mdx from "fumadocs-mdx/vite";

const config = defineConfig({
	base: "/docs",
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url))
		},
		dedupe: ["react", "react-dom", "@tanstack/react-router"]
	},
	plugins: [
		cloudflare({
			viteEnvironment: { name: "ssr" },
			persistState: {
				path: "../../.wrangler/state"
			},
			inspectorPort: 9240
		}),
		viteTsConfigPaths({
			projects: ["./tsconfig.json"]
		}),
		mdx(mdxConfig),
		tailwindcss(),
		tanstackStart(),
		viteReact({
			babel: {
				plugins: ["babel-plugin-react-compiler"]
			}
		})
	],
	server: {
		port: 3001
	}
});

export default config;
