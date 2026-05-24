const LOCALE = "es-PE";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat(LOCALE);

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateOnlyFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

export const formatCurrency = (value: number): string =>
  currencyFormatter.format(value);

export const formatNumber = (value: number): string =>
  numberFormatter.format(value);

export const formatDate = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
};

export const formatDateOnly = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateOnlyFormatter.format(date);
};

export const toDateInputValue = (
  value: string | Date | null | undefined,
): string => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
