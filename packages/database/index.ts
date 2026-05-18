export * from "drizzle-orm";
export { unionAll } from "drizzle-orm/sqlite-core";
export * from "./schema";

import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export const database = (database: any) => {
	return drizzle(database, { schema });
};

export type DatabaseInstance = ReturnType<typeof database>;
