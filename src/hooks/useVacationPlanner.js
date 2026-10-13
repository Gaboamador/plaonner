import { useCallback, useEffect, useRef, useState } from 'react';
import { addMonths, monthISO } from '../utils/dateUtils.js';
import { adjustBreaks, applyCalendarSelection, setSegmentDate } from '../utils/plannerUtils.js';
import { clearPlan, deserializePlan, initialWorkspace, readPlan, savePlan } from '../services/storageService.js';

export function useVacationPlanner() {
  const initial = useRef(null);
  if (initial.current === null) initial.current = readPlan();
  const [plan, setPlan] = useState(initial.current.plan);
  const [storageState, setStorageState] = useState(initial.current.error ? 'error' : initial.current.saved ? 'saved' : 'empty');
  const [storageError, setStorageError] = useState(initial.current.error);
  const [activeSegment, setActiveSegment] = useState(0);
  const [activeField, setActiveField] = useState('start');
  const [mode, setMode] = useState('vacation');
  const lastObservedPlan = useRef(plan);
  const skipResetWrite = useRef(false);

  useEffect(() => {
    // En StrictMode el efecto puede ejecutarse dos veces al montar.
    // Sólo persistimos cuando el objeto de planificación realmente cambia.
    if (plan === lastObservedPlan.current) {
      if (initial.current.migrated) {
        initial.current.migrated = false;
        try { savePlan(plan); setStorageState('saved'); }
        catch { setStorageState('error'); setStorageError('No se pudo migrar el almacenamiento del navegador.'); }
      }
      return;
    }
    lastObservedPlan.current = plan;
    if (skipResetWrite.current) { skipResetWrite.current = false; return; }
    try { savePlan(plan); setStorageState('saved'); setStorageError(null); }
    catch { setStorageState('error'); setStorageError('El navegador no permitió guardar los datos.'); }
  }, [plan]);

  const changeAvailableDays = useCallback(value => {
    const n = Number(value);
    setPlan(p => ({ ...p, availableDays: Math.max(0, Math.min(100000, Number.isFinite(n) ? Math.trunc(n) : 0)) }));
  }, []);

  const changeBreaks = useCallback(value => {
    const next = Math.max(0, Math.min(10, Math.trunc(Number(value) || 0)));
    setPlan(p => adjustBreaks(p, next));
    setActiveSegment(i => Math.min(i, next));
    setActiveField('start');
  }, []);

  const chooseSegment = useCallback(index => {
    const segment = plan.segments[index];
    setActiveSegment(index);
    setActiveField(segment.start && !segment.end ? 'end' : 'start');
    setMode('vacation');
  }, [plan.segments]);

  const chooseField = useCallback((index, field) => {
    setActiveSegment(index);
    setActiveField(field);
    setMode('vacation');
  }, []);

  const editSegmentDate = useCallback((index, field, iso) => {
    const result = setSegmentDate(plan.segments[index], field, iso || null);
    if (!result) return false;
    setPlan(p => ({ ...p, segments: p.segments.map((s, i) => i === index ? result.segment : s) }));
    setActiveSegment(index);
    setActiveField(result.nextField);
    setMode('vacation');
    return true;
  }, [plan.segments]);

  const pickDate = useCallback(iso => {
    if (mode !== 'vacation') return;
    const result = applyCalendarSelection(plan.segments[activeSegment], activeField, iso);
    setPlan(p => ({
      ...p,
      viewMonth: iso.slice(0, 7) !== p.viewMonth ? iso.slice(0, 7) : p.viewMonth,
      segments: p.segments.map((s, i) => i === activeSegment ? result.segment : s),
    }));
    setActiveField(result.nextField);
  }, [plan.segments, activeSegment, activeField, mode]);

  const toggleHoliday = useCallback((iso, label) => {
    setPlan(p => {
      const holidays = { ...p.holidays };
      if (Object.hasOwn(holidays, iso)) delete holidays[iso];
      else holidays[iso] = (label || '').trim().slice(0, 60) || 'Feriado';
      return { ...p, holidays };
    });
  }, []);

  const removeHoliday = useCallback(iso => {
    setPlan(p => {
      const holidays = { ...p.holidays };
      delete holidays[iso];
      return { ...p, holidays };
    });
  }, []);

  const navigateMonth = useCallback(offset => setPlan(p => ({ ...p, viewMonth: addMonths(p.viewMonth, offset) })), []);
  const goToday = useCallback(() => setPlan(p => ({ ...p, viewMonth: monthISO(new Date()) })), []);

  const reset = useCallback(() => {
    try { clearPlan(); setStorageState('empty'); setStorageError(null); }
    catch { setStorageState('error'); setStorageError('No se pudieron borrar los datos guardados.'); return false; }
    skipResetWrite.current = true;
    setPlan(initialWorkspace());
    setActiveSegment(0);
    setActiveField('start');
    setMode('vacation');
    return true;
  }, []);

  const importPlan = useCallback(text => {
    const imported = deserializePlan(text);
    setPlan(imported);
    setActiveSegment(0);
    setActiveField('start');
    setMode('vacation');
  }, []);

  return {
    plan, setPlan, activeSegment, activeField, mode, storageState, storageError,
    changeAvailableDays, changeBreaks, chooseSegment, chooseField, editSegmentDate,
    pickDate, toggleHoliday, removeHoliday, setMode, navigateMonth, goToday, reset, importPlan,
  };
}
