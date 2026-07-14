export function formatIndianDateTime(value) {
    if (!value) return "—";
    
    let date;
    let isDateOnly = false;
    if (value instanceof Date) {
        date = value;
    } else if (typeof value === "string") {
        const trimmed = value.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            // Force parsing as local midnight in Asia/Kolkata timezone
            date = new Date(`${trimmed}T00:00:00+05:30`);
            isDateOnly = true;
        } else {
            date = new Date(value);
        }
    } else {
        date = new Date(value);
    }
    
    if (Number.isNaN(date.getTime())) return "—";

    const formatter = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    const parts = formatter.formatToParts(date);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';
    const hour = parts.find(p => p.type === 'hour')?.value || '';
    const minute = parts.find(p => p.type === 'minute')?.value || '';
    let dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value || '';

    dayPeriod = dayPeriod.toUpperCase();
    if (dayPeriod.includes("AM") || dayPeriod.includes("A.M.")) {
        dayPeriod = "AM";
    } else if (dayPeriod.includes("PM") || dayPeriod.includes("P.M.")) {
        dayPeriod = "PM";
    }

    if (isDateOnly) {
        return `${day}-${month}-${year}`;
    }

    return `${day}-${month}-${year}, ${hour}:${minute} ${dayPeriod}`;
}

export function formatOrderStatusDateTime(value) {
    if (!value) return "Time unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Time unavailable";
    }

    const formatter = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });

    const parts = formatter.formatToParts(date);
    const day = parts.find(p => p.type === 'day')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const year = parts.find(p => p.type === 'year')?.value || '';
    const hour = parts.find(p => p.type === 'hour')?.value || '';
    const minute = parts.find(p => p.type === 'minute')?.value || '';
    let dayPeriod = parts.find(p => p.type === 'dayPeriod')?.value || '';

    dayPeriod = dayPeriod.toUpperCase().replace(/\./g, "").trim();
    if (dayPeriod.includes("AM")) {
        dayPeriod = "AM";
    } else if (dayPeriod.includes("PM")) {
        dayPeriod = "PM";
    }

    return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod}`;
}

