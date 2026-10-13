import { initialPlan, normalizePlan } from '../utils/plannerUtils.js';
import { initialTeam, normalizeTeam } from '../utils/teamUtils.js';

export const STORAGE_KEY = 'plaonner.planning.v1'; // Conservamos la clave para no perder datos existentes.
export const LEGACY_HOLIDAYS_KEY = 'vacationCalculator.holidays';
export const DATA_VERSION = 2;

export function initialWorkspace() { return { ...initialPlan(), team: initialTeam() }; }
export function normalizeWorkspace(raw) { return { ...normalizePlan(raw), team: normalizeTeam(raw?.team) }; }

export function readPlan(storage = window.localStorage) {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (![1, 2].includes(parsed?.version) || !parsed?.plan || typeof parsed.plan !== 'object' || Array.isArray(parsed.plan)) {
        throw new Error('Formato de planificación no compatible.');
      }
      return { plan: normalizeWorkspace(parsed.plan), saved: true, error: null, migrated: parsed.version === 1 };
    }
    const defaults = initialWorkspace();
    const legacy = storage.getItem(LEGACY_HOLIDAYS_KEY);
    if (legacy !== null) {
      defaults.holidays = normalizePlan({ ...defaults, holidays: JSON.parse(legacy) }).holidays;
      return { plan: defaults, saved: false, error: null, migrated: true };
    }
    return { plan: defaults, saved: false, error: null };
  } catch (error) {
    return { plan: initialWorkspace(), saved: false, error: `No se pudieron leer los datos locales: ${error.message}` };
  }
}

export function savePlan(plan, storage = window.localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: DATA_VERSION, plan }));
  storage.removeItem(LEGACY_HOLIDAYS_KEY);
}
export function clearPlan(storage = window.localStorage) {
  storage.removeItem(STORAGE_KEY);
  storage.removeItem(LEGACY_HOLIDAYS_KEY);
}
export function serializePlan(plan) {
  return JSON.stringify({ app: 'plaonner', version: DATA_VERSION, exportedAt: new Date().toISOString(), plan }, null, 2);
}
export function deserializePlan(text) {
  const parsed = JSON.parse(text);
  if (parsed?.app !== 'plaonner' || ![1, 2].includes(parsed.version) || !parsed.plan || typeof parsed.plan !== 'object' || Array.isArray(parsed.plan)) {
    throw new Error('El archivo no tiene un formato de respaldo compatible con Plaonner.');
  }
  if (parsed.version === 2 && (parsed.plan.team === null || typeof parsed.plan.team !== 'object' || Array.isArray(parsed.plan.team)
    || !Array.isArray(parsed.plan.team.people) || !Array.isArray(parsed.plan.team.responsibilities) || !Array.isArray(parsed.plan.team.vacations))) {
    throw new Error('La sección de equipo del respaldo no es válida.');
  }
  return normalizeWorkspace(parsed.plan);
}
