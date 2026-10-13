import { daysInclusive, isISODate, monthISO } from './dateUtils.js';

export const COLORS = ['#6cb6ff', '#8bd5ca', '#c6a0f6', '#f5a97f', '#eed49f', '#a6da95', '#f0c6c6', '#91d7e3', '#b7bdf8', '#f5bde6', '#ed8796'];
export const MAX_BREAKS = 10;

export function initialPlan(today = new Date()) {
  return {
    availableDays: 47,
    breaks: 1,
    segments: [{ start: null, end: null }, { start: null, end: null }],
    holidays: {},
    viewMonth: monthISO(today),
  };
}

export function normalizePlan(raw, today = new Date()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return initialPlan(today);
  const breaks = Math.max(0, Math.min(MAX_BREAKS, Number.isFinite(Number(raw.breaks)) ? Math.trunc(Number(raw.breaks)) : 1));
  const availableDays = Math.max(0, Math.min(100000, Number.isFinite(Number(raw.availableDays)) ? Math.trunc(Number(raw.availableDays)) : 47));
  const segments = Array.from({ length: breaks + 1 }, (_, i) => {
    const entry = Array.isArray(raw.segments) ? raw.segments[i] : null;
    const start = isISODate(entry?.start) ? entry.start : null;
    const end = isISODate(entry?.end) ? entry.end : null;
    return { start, end: start && end && end < start ? null : end };
  });
  const holidays = {};
  if (raw.holidays && typeof raw.holidays === 'object' && !Array.isArray(raw.holidays)) {
    for (const [date, name] of Object.entries(raw.holidays)) {
      if (isISODate(date) && typeof name === 'string') holidays[date] = name.slice(0, 60);
    }
  }
  const viewMonth = typeof raw.viewMonth === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw.viewMonth)
    ? raw.viewMonth : monthISO(today);
  return { availableDays, breaks, segments, holidays, viewMonth };
}

export function adjustBreaks(plan, requested) {
  const breaks = Math.max(0, Math.min(MAX_BREAKS, Number.isFinite(Number(requested)) ? Math.trunc(Number(requested)) : 0));
  const segments = Array.from({ length: breaks + 1 }, (_, i) => plan.segments[i] || { start: null, end: null });
  return { ...plan, breaks, segments };
}

/** Reproduce la interacción del selector de reservas existente. */
export function applyCalendarSelection(segment, field, iso) {
  if (!isISODate(iso)) return { segment, nextField: field };
  if (field === 'start') {
    if (!segment.start && segment.end && iso <= segment.end) {
      return { segment: { start: iso, end: segment.end }, nextField: 'start' };
    }
    return { segment: { start: iso, end: null }, nextField: 'end' };
  }
  if (!segment.start) return { segment: { ...segment, end: iso }, nextField: 'start' };
  if (iso < segment.start) return { segment: { start: iso, end: null }, nextField: 'end' };
  return { segment: { ...segment, end: iso }, nextField: 'start' };
}

export function setSegmentDate(segment, field, iso) {
  if (iso !== null && !isISODate(iso)) return null;
  if (field === 'start') {
    const end = iso && segment.end && segment.end < iso ? null : segment.end;
    return { segment: { start: iso, end }, nextField: iso && !end ? 'end' : 'start' };
  }
  if (iso && segment.start && iso < segment.start) return null;
  return { segment: { ...segment, end: iso }, nextField: iso ? 'start' : segment.start ? 'end' : 'start' };
}

export function calculateTotals(plan) {
  const used = plan.segments.reduce((sum, segment) => sum + daysInclusive(segment.start, segment.end), 0);
  return { used, remaining: plan.availableDays - used, count: plan.segments.length };
}
