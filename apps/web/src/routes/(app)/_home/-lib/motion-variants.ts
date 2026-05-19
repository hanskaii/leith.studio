export const fadeUp = {
	hidden: { opacity: 0, y: 18 },
	visible: (i: number = 0) => ({
		opacity: 1,
		y: 0,
		transition: {
			delay: i * 0.07,
			duration: 0.5,
			ease: [0.16, 1, 0.3, 1] as const
		}
	})
};

export const stagger = {
	hidden: {},
	visible: { transition: { staggerChildren: 0.07 } }
};
