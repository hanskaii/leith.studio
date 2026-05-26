export type MenuItem = {
	title: string;
	url: string;
	icon: string;
	items?: MenuItem[];
};

export type MenuGroup = {
	label: string;
	items: MenuItem[];
};

export type MenuConfig = {
	type: string;
	groups: MenuGroup[];
};

export type MenuResponse = MenuConfig[];
