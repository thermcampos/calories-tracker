export interface CurrentDateResult {
  date: string;       // "2026-02-13"
  dateTime: Date;     // new Date(year, month-1, day) — local-midnight Date
  timeString: string; // "HH:MM"
}

export function getCurrentDate(timezone: string): CurrentDateResult {
  const now = new Date();
  const effectiveTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const options: Intl.DateTimeFormatOptions = {
    timeZone: effectiveTimezone,
    year: 'numeric',
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  const formatter = new Intl.DateTimeFormat("en-GB", options);
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value;

  const year = parseInt(getPart("year") || "0");
  const month = parseInt(getPart("month") || "0");
  const day = parseInt(getPart("day") || "0");
  const hour = parseInt(getPart("hour") || "0");
  const minute = parseInt(getPart("minute") || "0");

  const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const dateTime = new Date(year, month - 1, day);
  const timeString = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return { date, dateTime, timeString };
}
