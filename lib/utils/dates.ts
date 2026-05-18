import { differenceInCalendarDays, format, parseISO } from "date-fns";

export function getDaysCount(startDate?: string | null, endDate?: string | null) {
  if (!startDate || !endDate) return 3;
  return Math.max(1, differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1);
}

export function formatDateRange(startDate?: string | null, endDate?: string | null) {
  if (!startDate && !endDate) return "Dates flexible";
  if (startDate && !endDate) return format(parseISO(startDate), "MMM d, yyyy");
  if (!startDate || !endDate) return "Dates flexible";
  return `${format(parseISO(startDate), "MMM d")} - ${format(parseISO(endDate), "MMM d, yyyy")}`;
}
