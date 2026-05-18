const IGNORED = [/routeTree\.gen\.ts$/, /worker-configuration\.d\.ts$/];

export default {
	"*.{js,ts,jsx,tsx,json,css,md}": (files) => {
		const targets = files.filter((f) => !IGNORED.some((re) => re.test(f)));
		if (targets.length === 0) return [];
		return [
			`oxfmt -c tooling/lint/.oxfmtrc.json --write ${targets.map((f) => `"${f}"`).join(" ")}`
		];
	}
};
