import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);

const Day = Object.assign(dayjs, {
	timeAgo: (d?: string | number | Date | null) => {
		if (!d) return "—";
		return dayjs(d).fromNow();
	}
});

export { Day };
export default Day;
