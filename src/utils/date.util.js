// IST offset is UTC + 5:30 (5.5 hours = 19,800,000 milliseconds)
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function getIstDateParts(date = new Date()) {
    const istTime = date.getTime() + IST_OFFSET_MS;
    const istDate = new Date(istTime);
    return {
        year: String(istDate.getUTCFullYear()),
        month: String(istDate.getUTCMonth() + 1).padStart(2, "0"),
        day: String(istDate.getUTCDate()).padStart(2, "0"),
        hour: istDate.getUTCHours(),
        minute: istDate.getUTCMinutes(),
    };
}

export function getIstYyyyMmDd(date = new Date()) {
    const parts = getIstDateParts(date);
    return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDaysYyyyMmDd(yyyyMmDd, days) {
    const [y, m, d] = String(yyyyMmDd).split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + Number(days || 0));
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
}
