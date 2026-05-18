import fs from "node:fs";
import path from "node:path";

function findRoot(startDir = process.cwd()): string {
	let dir = startDir;

	while (true) {
		if (
			fs.existsSync(path.join(dir, "pnpm-workspace.yaml")) ||
			fs.existsSync(path.join(dir, ".git"))
		) {
			return dir;
		}

		const parent = path.dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}

	throw new Error(
		"Could not find monorepo root. Are you running inside a monorepo?"
	);
}

export function getD1DBPath(appsPath: string) {
	try {
		const projectRoot = findRoot();
		const basePath = path.resolve(projectRoot, appsPath, ".wrangler");

		const files = fs
			.readdirSync(basePath, { encoding: "utf-8", recursive: true })
			.map((f) => f.replace(/\\/g, "/"))
			.filter(
				(fileName) =>
					fileName.endsWith(".sqlite") &&
					fileName.includes("d1/miniflare-")
			);

		if (!files.length) {
			throw new Error(`No .sqlite file found at ${basePath}`);
		}

		files.sort((a, b) => {
			const statA = fs.statSync(path.join(basePath, a));
			const statB = fs.statSync(path.join(basePath, b));
			return statB.mtime.getTime() - statA.mtime.getTime();
		});
		const finalPath = path.resolve(basePath, files[0]);
		console.log(`🔌 Resolved D1 DB Path: ${finalPath}`);
		return finalPath;
	} catch (error) {
		console.warn(`Error resolving local D1 DB: ${error}`);
	}
}
