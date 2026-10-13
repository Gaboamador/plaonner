import { describe, expect, it } from 'vitest';
import { daysInclusive } from '../src/utils/dateUtils.js';
import { applyCalendarSelection, calculateTotals, initialPlan } from '../src/utils/plannerUtils.js';

// Pruebas rápidas independientes de la interfaz (complementan test:logic).
describe('Plaonner', () => {
  it('cuenta ambos extremos de un rango', () => expect(daysInclusive('2026-10-12', '2026-11-27')).toBe(47));
  it('selecciona primero inicio y luego fin', () => {
    const first = applyCalendarSelection({ start: null, end: null }, 'start', '2026-10-12');
    const second = applyCalendarSelection(first.segment, first.nextField, '2026-11-27');
    expect(second).toEqual({ segment: { start: '2026-10-12', end: '2026-11-27' }, nextField: 'start' });
  });
  it('no cuenta rangos incompletos', () => {
    const plan = initialPlan();
    plan.segments[0].start = '2026-10-12';
    expect(calculateTotals(plan).used).toBe(0);
  });
});
