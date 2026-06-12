const SALE_DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function getTodayDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseSaleDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!SALE_DATE_INPUT_PATTERN.test(trimmed)) return null;

  const [year, month, day] = trimmed.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function saleDateToInputValue(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return getTodayDateInputValue();
  return getTodayDateInputValue(date);
}

export function formatSaleDateDisplay(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
