import { daysInclusive, isISODate, stamp } from './dateUtils.js';

export const VACATION_STATUSES = ['confirmed', 'tentative'];
export const TEAM_COLORS = ['#6cb6ff', '#8bd5ca', '#c6a0f6', '#f5a97f', '#eed49f', '#a6da95', '#91d7e3', '#f5bde6', '#ff8995', '#b7bdf8'];

export function initialTeam() { return { people: [], responsibilities: [], vacations: [] }; }

export function createId(prefix = 'id') {
  return `${prefix}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

const normalizedName = value => typeof value === 'string' ? value.trim().slice(0, 90) : '';
const isPlainObject = obj => obj !== null && typeof obj === 'object' && !Array.isArray(obj);

/** Normaliza archivos de respaldo y descarta referencias inválidas sin dejar entidades huérfanas. */
export function normalizeTeam(raw) {
  if (!isPlainObject(raw)) return initialTeam();
  const responsibilities = [];
  const responsibilityIds = new Set();
  for (const entry of Array.isArray(raw.responsibilities) ? raw.responsibilities.slice(0, 100) : []) {
    const name = normalizedName(entry?.name);
    const id = entry?.id;
    if (typeof id !== 'string' || !id || id.length > 100 || responsibilityIds.has(id) || !name) continue;
    responsibilityIds.add(id);
    responsibilities.push({ id, name, minCoverage: Math.max(1, Math.min(100, Math.trunc(Number(entry.minCoverage) || 1))) });
  }
  const people = [];
  const personIds = new Set();
  for (const entry of Array.isArray(raw.people) ? raw.people.slice(0, 1000) : []) {
    const name = normalizedName(entry?.name);
    const id = entry?.id;
    if (typeof id !== 'string' || !id || id.length > 100 || personIds.has(id) || !name) continue;
    personIds.add(id);
    const membership = Array.isArray(entry.responsibilityIds) ? entry.responsibilityIds : [];
    people.push({ id, name, responsibilityIds: [...new Set(membership.filter(ref => responsibilityIds.has(ref)))], });
  }
  const vacations = [];
  const vacationIds = new Set();
  for (const entry of Array.isArray(raw.vacations) ? raw.vacations.slice(0, 5000) : []) {
    if (typeof entry?.id !== 'string' || !entry.id || entry.id.length > 100 || vacationIds.has(entry.id) || !personIds.has(entry.personId)) continue;
    if (!isISODate(entry.start) || !isISODate(entry.end) || entry.start > entry.end) continue;
    vacationIds.add(entry.id);
    vacations.push({ id: entry.id, personId: entry.personId, start: entry.start, end: entry.end, status: entry.status === 'tentative' ? 'tentative' : 'confirmed' });
  }
  return { people, responsibilities, vacations };
}

export function removePerson(team, personId) {
  return { ...team, people: team.people.filter(p => p.id !== personId), vacations: team.vacations.filter(v => v.personId !== personId) };
}
export function removeResponsibility(team, id) {
  return {
    ...team,
    responsibilities: team.responsibilities.filter(r => r.id !== id),
    people: team.people.map(p => ({ ...p, responsibilityIds: p.responsibilityIds.filter(x => x !== id) })),
  };
}

export function datesBetween(start, end, maxDays = 4000) {
  if (!isISODate(start) || !isISODate(end) || start > end) return [];
  const result = [];
  for (let t = stamp(start), last = stamp(end); t <= last && result.length < maxDays; t += 86400000) {
    result.push(new Date(t).toISOString().slice(0, 10));
  }
  return result;
}

export function isWorkingDay(iso, holidays = {}) {
  const day = new Date(stamp(iso)).getUTCDay();
  return day !== 0 && day !== 6 && !Object.hasOwn(holidays, iso);
}

export function findAbsences(team, iso) {
  const confirmed = new Set();
  const tentative = new Set();
  for (const vacation of team.vacations) {
    if (vacation.start <= iso && vacation.end >= iso) {
      (vacation.status === 'tentative' ? tentative : confirmed).add(vacation.personId);
    }
  }
  return { confirmed, tentative };
}

/** Una persona con varios períodos superpuestos sólo cuenta una vez. */
export function getDayCoverage(team, iso, holidays = {}) {
  const { confirmed, tentative } = findAbsences(team, iso);
  const working = isWorkingDay(iso, holidays);
  const responsibilities = team.responsibilities.map(r => {
    const assigned = team.people.filter(p => p.responsibilityIds.includes(r.id));
    const available = assigned.filter(p => !confirmed.has(p.id));
    return { id: r.id, name: r.name, assigned: assigned.length, available: available.length,
      minCoverage: r.minCoverage, critical: working && available.length < r.minCoverage };
  });
  return { iso, working, confirmed, tentative, absentCount: confirmed.size,
    presentCount: Math.max(0, team.people.length - confirmed.size), responsibilities,
    critical: responsibilities.some(r => r.critical) };
}

export function getMonthDays(month) {
  const [year, numericMonth] = month.split('-').map(Number);
  const count = new Date(Date.UTC(year, numericMonth, 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
}

export function summarizeMonth(team, month, holidays = {}) {
  const days = getMonthDays(month).map(iso => getDayCoverage(team, iso, holidays));
  const businessDays = days.filter(d => d.working);
  const criticalDays = businessDays.filter(d => d.critical);
  const maxAbsent = Math.max(0, ...businessDays.map(d => d.absentCount));
  const responsibilityAlerts = team.responsibilities.map(r => {
    const affected = criticalDays.filter(day => day.responsibilities.some(x => x.id === r.id && x.critical));
    return { id: r.id, name: r.name, dates: affected.map(d => d.iso), count: affected.length };
  }).filter(x => x.count > 0);
  const peakDays = businessDays.filter(d => d.absentCount === maxAbsent && maxAbsent > 0).map(d => d.iso);
  return {
    days, businessDays: businessDays.length, criticalDays: criticalDays.length,
    maxAbsent, peakDays, responsibilityAlerts,
    peopleWithVacation: new Set(team.vacations.filter(v => v.status === 'confirmed' && days.some(d => v.start <= d.iso && v.end >= d.iso)).map(v => v.personId)).size,
  };
}

/** Vista previa: evalúa como confirmado el rango que se está editando sin guardarlo. */
export function simulateVacation(team, candidate, holidays = {}) {
  if (!candidate?.personId || !isISODate(candidate.start) || !isISODate(candidate.end) || candidate.start > candidate.end) return null;
  const withoutEdited = { ...team, vacations: team.vacations.filter(v => v.id !== candidate.id) };
  const proposed = { ...withoutEdited, vacations: [...withoutEdited.vacations, { ...candidate, status: 'confirmed' }] };
  const examined = datesBetween(candidate.start, candidate.end, 3660).filter(iso => isWorkingDay(iso, holidays));
  const conflicts = examined.map(iso => getDayCoverage(proposed, iso, holidays)).filter(d => d.critical);
  const introduced = conflicts.filter(day => !getDayCoverage(withoutEdited, day.iso, holidays).critical);
  return { workingDays: examined.length, conflicts: conflicts.length,
    newlyCritical: introduced.length, maxAbsent: Math.max(0, ...examined.map(d => getDayCoverage(proposed, d, holidays).absentCount)),
    affectedResponsibilities: [...new Set(conflicts.flatMap(d => d.responsibilities.filter(r => r.critical).map(r => r.name)))],
    truncated: daysInclusive(candidate.start, candidate.end) > 3660 };
}

/**
 * Una columna representa siempre una semana completa de lunes a domingo,
 * incluso si empieza o termina fuera del mes visible.
 * Las persona-días son CORRIDAS; las alertas continúan siendo LABORABLES.
 */
export function summarizeWeeks(team, month, holidays = {}) {
  const mondays = [...new Set(getMonthDays(month).map(iso => {
    const utc = stamp(iso);
    const weekday = (new Date(utc).getUTCDay() + 6) % 7;
    return new Date(utc - weekday * 86400000).toISOString().slice(0, 10);
  }))];
  return mondays.map(monday => {
    const end = new Date(stamp(monday) + 6 * 86400000).toISOString().slice(0, 10);
    const days = datesBetween(monday, end).map(iso => getDayCoverage(team, iso, holidays));
    const workingDays = days.filter(day => day.working);
    return {
      start: monday,
      end,
      absentPersonDays: days.reduce((sum, day) => sum + day.absentCount, 0),
      criticalDays: workingDays.filter(day => day.critical).length,
      peakAbsences: Math.max(0, ...workingDays.map(day => day.absentCount)),
    };
  });
}

/** Días corridos de vacaciones confirmadas de una persona durante lunes–domingo.
 * Fines de semana y feriados se cuentan; períodos superpuestos no duplican días.
 */
export function getPersonWeekDays(team, personId, monday) {
  const end = new Date(stamp(monday) + 6 * 86400000).toISOString().slice(0, 10);
  return datesBetween(monday, end).filter(iso => findAbsences(team, iso).confirmed.has(personId)).length;
}
