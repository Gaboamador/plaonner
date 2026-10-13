/** Fechas civiles ISO (AAAA-MM-DD) para evitar saltos por zona horaria y DST. */
export function isISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

export function fromLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toLocalDate(iso) {
  if (!isISODate(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function stamp(iso) {
  if (!isISODate(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

export function daysInclusive(start, end) {
  if (!isISODate(start) || !isISODate(end)) return 0;
  const difference = stamp(end) - stamp(start);
  return difference < 0 ? 0 : difference / 86400000 + 1;
}

export function formatDate(iso) {
  const parsed = toLocalDate(iso);
  return parsed ? new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(parsed) : '—';
}

export function formatLongDate(iso) {
  const parsed = toLocalDate(iso);
  return parsed ? new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(parsed) : '';
}

export function monthISO(value) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

export function monthDate(value) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

export function addMonths(month, offset) {
  const date = monthDate(month);
  return monthISO(new Date(date.getFullYear(), date.getMonth() + offset, 1));
}

export function buildCalendarDates(month) {
  const first = monthDate(month);
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return fromLocalDate(date);
  });
}
