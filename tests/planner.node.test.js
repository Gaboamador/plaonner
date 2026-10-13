import test from 'node:test';
import assert from 'node:assert/strict';
import { addMonths, buildCalendarDates, daysInclusive, fromLocalDate, isISODate } from '../src/utils/dateUtils.js';
import { adjustBreaks, applyCalendarSelection, calculateTotals, initialPlan, normalizePlan, setSegmentDate } from '../src/utils/plannerUtils.js';
import { clearPlan, deserializePlan, readPlan, savePlan, serializePlan, initialWorkspace, STORAGE_KEY, LEGACY_HOLIDAYS_KEY } from '../src/services/storageService.js';

function storageMock() {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key), data };
}

test('fechas inválidas se rechazan', () => {
  assert.equal(isISODate('2026-02-29'), false);
  assert.equal(isISODate('2028-02-29'), true);
  assert.equal(isISODate('2026-13-01'), false);
});

test('conteo inclusivo para un solo día y cruce entre meses', () => {
  assert.equal(daysInclusive('2026-11-27', '2026-11-27'), 1);
  assert.equal(daysInclusive('2026-10-12', '2026-11-27'), 47);
  assert.equal(daysInclusive('2026-12-31', '2027-01-02'), 3);
  assert.equal(daysInclusive('2026-11-02', '2026-10-30'), 0);
});

test('conteo sin saltos por horario de verano', () => {
  assert.equal(daysInclusive('2026-03-07', '2026-03-10'), 4);
});

test('el calendario contiene 42 fechas, comienza lunes, navega diciembre-enero', () => {
  assert.equal(buildCalendarDates('2026-11').length, 42);
  assert.equal(buildCalendarDates('2026-11')[0], '2026-10-26');
  assert.equal(addMonths('2026-12', 1), '2027-01');
});

test('elegir inicio y después fin genera un rango completo', () => {
  const first = applyCalendarSelection({ start: null, end: null }, 'start', '2026-10-12');
  assert.equal(first.nextField, 'end');
  assert.deepEqual(first.segment, { start: '2026-10-12', end: null });
  const second = applyCalendarSelection(first.segment, first.nextField, '2026-11-27');
  assert.equal(second.nextField, 'start');
  assert.equal(daysInclusive(second.segment.start, second.segment.end), 47);
});

test('elegir fin anterior desde calendario reinicia el inicio', () => {
  const result = applyCalendarSelection({ start: '2026-11-12', end: null }, 'end', '2026-11-05');
  assert.deepEqual(result, { segment: { start: '2026-11-05', end: null }, nextField: 'end' });
});

test('permite definir el fin primero y preservar ese fin al elegir el inicio', () => {
  const first = applyCalendarSelection({ start: null, end: null }, 'end', '2026-11-27');
  assert.equal(first.nextField, 'start');
  const second = applyCalendarSelection(first.segment, 'start', '2026-10-12');
  assert.deepEqual(second.segment, { start: '2026-10-12', end: '2026-11-27' });
});

test('editar fecha inicial invalida fin anterior, fecha final inválida se rechaza', () => {
  const seg = { start: '2026-10-12', end: '2026-11-27' };
  assert.deepEqual(setSegmentDate(seg, 'start', '2026-12-01').segment, { start: '2026-12-01', end: null });
  assert.equal(setSegmentDate(seg, 'end', '2026-10-01'), null);
});

test('quiebres mantienen tramos existentes y nuevas secciones vacías', () => {
  const base = initialPlan(new Date(2026, 9, 1));
  const next = adjustBreaks(base, 3);
  assert.equal(next.segments.length, 4);
  assert.equal(adjustBreaks(next, 0).segments.length, 1);
  assert.equal(adjustBreaks(next, 100).segments.length, 11);
});

test('total y restantes no incluyen tramos incompletos', () => {
  const plan = normalizePlan({ breaks: 1, availableDays: 47, segments: [{ start: '2026-10-12', end: '2026-11-27' }, { start: '2026-12-01', end: null }] });
  assert.deepEqual(calculateTotals(plan), { used: 47, remaining: 0, count: 2 });
});

test('localStorage guarda/restaura y borra el respaldo', () => {
  const storage = storageMock();
  const plan = initialPlan(new Date(2026, 9, 1));
  plan.holidays['2026-11-23'] = 'Feriado de prueba';
  savePlan(plan, storage);
  assert.equal(readPlan(storage).plan.holidays['2026-11-23'], 'Feriado de prueba');
  clearPlan(storage);
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.equal(readPlan(storage).saved, false);
});

test('migración de feriados del HTML anterior si comparten origen', () => {
  const storage = storageMock();
  storage.setItem(LEGACY_HOLIDAYS_KEY, JSON.stringify({ '2026-11-23': 'Feriado' }));
  const loaded = readPlan(storage);
  assert.equal(loaded.migrated, true);
  assert.equal(loaded.plan.holidays['2026-11-23'], 'Feriado');
});

test('respaldo JSON puede importarse y valida la versión', () => {
  const plan = initialWorkspace();
  assert.deepEqual(deserializePlan(serializePlan(plan)), plan);
  assert.throws(() => deserializePlan('{"app":"otro","version":1,"plan":{}}'));
});

test('lectura de JSON inválido no provoca excepción ni pierde la capacidad de iniciar', () => {
  const storage = storageMock();
  storage.setItem(STORAGE_KEY, '{no-JSON');
  const loaded = readPlan(storage);
  assert.equal(loaded.saved, false);
  assert.match(loaded.error, /No se pudieron leer/);
});
