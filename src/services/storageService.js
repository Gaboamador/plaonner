import { initialPlan, normalizePlan } from '../utils/plannerUtils.js';

export const STORAGE_KEY = 'plaonner.planning.v1';
export const LEGACY_HOLIDAYS_KEY = 'vacationCalculator.holidays';
export const DATA_VERSION = 1;

export function readPlan(storage = window.localStorage) {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (parsed?.version !== DATA_VERSION || !parsed?.plan || typeof parsed.plan !== 'object') {
        throw new Error('Formato de planificación no compatible.');
      }
      return { plan: normalizePlan(parsed.plan), saved: true, error: null };
    }
    const defaults = initialPlan();
    // Solo funciona si el origen coincide con el del HTML anterior.
    const legacy = storage.getItem(LEGACY_HOLIDAYS_KEY);
    if (legacy !== null) {
      defaults.holidays = normalizePlan({ ...defaults, holidays: JSON.parse(legacy) }).holidays;
      return { plan: defaults, saved: false, error: null, migrated: true };
    }
    return { plan: defaults, saved: false, error: null };
  } catch (error) {
    return { plan: initialPlan(), saved: false, error: `No se pudieron leer los datos locales: ${error.message}` };
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
  if (parsed?.app !== 'plaonner' || parsed?.version !== DATA_VERSION || !parsed.plan || typeof parsed.plan !== 'object' || Array.isArray(parsed.plan)) {
    throw new Error('El archivo no tiene un formato de respaldo compatible con Plaonner.');
  }
  return normalizePlan(parsed.plan);
}
