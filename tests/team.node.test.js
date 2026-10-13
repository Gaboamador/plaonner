import test from 'node:test';
import assert from 'node:assert/strict';
import { datesBetween, findAbsences, getDayCoverage, getMonthDays, getPersonWeekDays, initialTeam, isWorkingDay, normalizeTeam, removePerson, removeResponsibility, simulateVacation, summarizeMonth, summarizeWeeks } from '../src/utils/teamUtils.js';
import { deserializePlan, initialWorkspace, readPlan, savePlan, serializePlan, STORAGE_KEY, DATA_VERSION } from '../src/services/storageService.js';

const teamFixture = () => ({
  responsibilities: [{ id: 'a', name: 'Tarea A', minCoverage: 1 }, { id: 'b', name: 'Tarea B', minCoverage: 1 }, { id: 'c', name: 'Tarea C', minCoverage: 1 }],
  people: Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `Persona ${i}`, responsibilityIds: [i < 3 ? 'a' : i < 6 ? 'b' : 'c'] })),
  vacations: [],
});
const vac = (personId, start = '2026-11-02', end = '2026-11-06', status = 'confirmed', id = `v-${personId}`) => ({ id, personId, start, end, status });
const storageMock = () => { const memory = new Map(); return { getItem: key => memory.get(key) ?? null, setItem: (key,value) => memory.set(key,String(value)), removeItem: key => memory.delete(key), memory }; };

test('sin ausencias no hay conflictos: 10 personas repartidas 3/3/4', () => {
  const team = teamFixture();
  const summary = summarizeMonth(team, '2026-11');
  assert.equal(summary.criticalDays, 0);
  assert.equal(getDayCoverage(team, '2026-11-02').responsibilities.length, 3);
});

test('siete ausentes pero una persona por responsabilidad: cobertura completa', () => {
  const team = teamFixture();
  for (const i of [0,1,3,4,6,7,8]) team.vacations.push(vac(`p${i}`));
  const day = getDayCoverage(team, '2026-11-04');
  assert.equal(day.absentCount, 7);
  assert.deepEqual(day.responsibilities.map(x => x.available), [1,1,1]);
  assert.equal(day.critical, false);
  assert.equal(summarizeMonth(team, '2026-11').criticalDays, 0);
});

test('toda una responsabilidad de vacaciones: conflicto aunque estén presentes siete', () => {
  const team = teamFixture();
  team.vacations.push(vac('p0'),vac('p1'),vac('p2'));
  const day = getDayCoverage(team, '2026-11-04');
  assert.equal(day.absentCount, 3);
  assert.equal(day.critical, true);
  assert.deepEqual(day.responsibilities.filter(x => x.critical).map(x => x.name), ['Tarea A']);
  const month = summarizeMonth(team, '2026-11');
  assert.equal(month.criticalDays, 5);
  assert.equal(month.responsibilityAlerts[0].count, 5);
});

test('el mínimo de cobertura configurable es respetado', () => {
  const team = teamFixture(); team.responsibilities[0].minCoverage = 2;
  team.vacations.push(vac('p0'),vac('p1'));
  assert.equal(getDayCoverage(team, '2026-11-02').critical, true);
  team.responsibilities[0].minCoverage = 1;
  assert.equal(getDayCoverage(team, '2026-11-02').critical, false);
});

test('los sábados, domingos y feriados no disparan alertas', () => {
  const team = teamFixture();
  team.vacations.push(vac('p0','2026-11-01','2026-11-03'),vac('p1','2026-11-01','2026-11-03'),vac('p2','2026-11-01','2026-11-03'));
  assert.equal(isWorkingDay('2026-11-01'), false);
  assert.equal(getDayCoverage(team, '2026-11-01').critical, false);
  assert.equal(getDayCoverage(team, '2026-11-02').critical, true);
  assert.equal(getDayCoverage(team, '2026-11-02', { '2026-11-02':'Feriado' }).critical, false);
  assert.equal(summarizeMonth(team,'2026-11',{'2026-11-02':'Feriado'}).criticalDays,1);
});

test('las vacaciones tentativas se muestran, pero no cuentan para cobertura', () => {
  const team = teamFixture();
  team.vacations.push(vac('p0'),vac('p1'),vac('p2','2026-11-02','2026-11-06','tentative'));
  const day = getDayCoverage(team, '2026-11-03');
  assert.equal(day.absentCount, 2);
  assert.equal(day.tentative.has('p2'), true);
  assert.equal(day.critical, false);
  const preview = simulateVacation(team, vac('p2', '2026-11-02', '2026-11-06','tentative'));
  assert.equal(preview.conflicts,5);
  assert.equal(preview.newlyCritical,5);
  assert.deepEqual(preview.affectedResponsibilities,['Tarea A']);
});

test('la vista previa edita un período sin contar dos veces la misma persona', () => {
  const team = teamFixture();
  team.vacations.push(vac('p0'), vac('p1'));
  const preview = simulateVacation(team, vac('p0','2026-11-02','2026-11-04'));
  assert.equal(preview.maxAbsent,2);
  assert.equal(preview.conflicts,0);
});

test('varios períodos superpuestos de una misma persona cuentan una sola ausencia', () => {
  const team = teamFixture();
  team.vacations.push(vac('p0'), vac('p0','2026-11-04','2026-11-08','confirmed','v-second'));
  const d = getDayCoverage(team,'2026-11-05');
  assert.equal(d.absentCount,1);
  assert.equal(d.responsibilities[0].available,2);
});

test('permite más de una responsabilidad por persona', () => {
  const team = teamFixture(); team.people[2].responsibilityIds.push('b');
  team.vacations.push(vac('p0'),vac('p1'));
  assert.equal(getDayCoverage(team,'2026-11-04').responsibilities[1].available,4);
});

test('resumen semanal contabiliza persona-días corridos y fechas cruzadas', () => {
  const team = teamFixture(); team.vacations.push(vac('p0'),vac('p1'));
  const weeks = summarizeWeeks(team,'2026-11');
  const week = weeks.find(x => x.start === '2026-11-02');
  assert.equal(week.absentPersonDays,10);
  assert.equal(week.peakAbsences,2);
  assert.equal(week.criticalDays,0);
  assert.equal(getMonthDays('2026-11').length,30);
  assert.deepEqual(datesBetween('2026-12-31','2027-01-02'),['2026-12-31','2027-01-01','2027-01-02']);
});

test('borrar persona también borra sus vacaciones; borrar responsabilidad conserva los períodos', () => {
  const team = teamFixture(); team.vacations.push(vac('p0'),vac('p1'));
  const afterPerson = removePerson(team,'p0');
  assert.equal(afterPerson.vacations.length,1);
  assert.equal(afterPerson.people.length,9);
  const afterResp = removeResponsibility(afterPerson,'a');
  assert.equal(afterResp.responsibilities.length,2);
  assert.equal(afterResp.vacations.length,1);
  assert.equal(afterResp.people.some(p => p.responsibilityIds.includes('a')),false);
});

test('normalización rechaza IDs repetidos, fechas imposibles y referencias huérfanas', () => {
  const team = teamFixture();
  team.people.push({ ...team.people[0] });
  team.vacations.push(vac('missing'), vac('p0','2026-02-30','2026-03-02','confirmed','bad'));
  const normalized = normalizeTeam(team);
  assert.equal(normalized.people.length,10);
  assert.equal(normalized.vacations.length,0);
  assert.deepEqual(normalizeTeam(undefined),initialTeam());
});

test('workspace v2 persiste equipo y tramos individuales en un mismo JSON', () => {
  const storage = storageMock();
  const plan = initialWorkspace();
  plan.availableDays = 33;
  plan.team = teamFixture(); plan.team.vacations.push(vac('p0'));
  savePlan(plan,storage);
  assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version, DATA_VERSION);
  assert.deepEqual(readPlan(storage).plan,plan);
  assert.deepEqual(deserializePlan(serializePlan(plan)),plan);
});

test('migración transparente de localStorage v1 a v2: no desaparecen los tramos', () => {
  const storage = storageMock();
  const previous = { availableDays:47,breaks:0,segments:[{start:'2026-10-12',end:'2026-11-27'}],holidays:{'2026-11-23':'Feriado'},viewMonth:'2026-11' };
  storage.setItem(STORAGE_KEY,JSON.stringify({version:1,plan:previous}));
  const restored = readPlan(storage);
  assert.equal(restored.migrated,true);
  assert.equal(restored.plan.segments[0].start,'2026-10-12');
  assert.equal(restored.plan.team.people.length,0);
  assert.equal(restored.plan.holidays['2026-11-23'],'Feriado');
  const imported = deserializePlan(JSON.stringify({app:'plaonner',version:1,plan:previous}));
  assert.deepEqual(imported,restored.plan);
});

test('respaldo v2 incompleto se rechaza explícitamente, sin reemplazar datos válidos', () => {
  assert.throws(() => deserializePlan(JSON.stringify({app:'plaonner',version:2,plan:{team:{people:[]}}})),/equipo/);
});

test('grilla semanal suma días corridos sin duplicar períodos, incluso feriados', () => {
  const team = teamFixture(); team.vacations.push(vac('p0'),vac('p0','2026-11-04','2026-11-06','confirmed','v0bis'));
  assert.equal(getPersonWeekDays(team,'p0','2026-11-02'),5);
  assert.equal(getPersonWeekDays(team,'p1','2026-11-02'),0);
  assert.equal(getPersonWeekDays(team,'p0','2026-11-02'),5);
});

test('regresión: 28/09 al 09/10 equivale a 7 días en una semana y 5 en la siguiente', () => {
  const team = teamFixture();
  team.vacations.push(vac('p0','2026-09-28','2026-10-09'));
  const holidays = {'2026-10-02':'Feriado de ejemplo'};
  assert.equal(getPersonWeekDays(team,'p0','2026-09-28'),7);
  assert.equal(getPersonWeekDays(team,'p0','2026-10-05'),5);
  const october = summarizeWeeks(team,'2026-10',holidays);
  assert.equal(october.find(week => week.start === '2026-09-28').absentPersonDays,7);
  assert.equal(october.find(week => week.start === '2026-10-05').absentPersonDays,5);
  assert.equal(october.filter(w => ['2026-09-28','2026-10-05'].includes(w.start)).reduce((s,w) => s + w.absentPersonDays,0),12);
  // Días corridos para vacaciones, días hábiles para cobertura.
  assert.equal(october.find(week => week.start === '2026-09-28').peakAbsences,1);
  assert.equal(getDayCoverage(team,'2026-10-03',holidays).working,false);
  assert.equal(getDayCoverage(team,'2026-10-02',holidays).working,false);
  assert.equal(summarizeMonth(team,'2026-10',holidays).criticalDays,0);
});

test('vacaciones de sábado a domingo suman dos días sin alertas en fin de semana', () => {
  const team = teamFixture();
  team.vacations.push(vac('p0','2026-10-03','2026-10-04'));
  assert.equal(getPersonWeekDays(team,'p0','2026-09-28'),2);
  assert.equal(summarizeWeeks(team,'2026-10').find(w => w.start === '2026-09-28').absentPersonDays,2);
  assert.equal(getDayCoverage(team,'2026-10-03').critical,false);
});

test('dos períodos superpuestos en la semana contabilizan cada día una sola vez', () => {
  const team = teamFixture();
  team.vacations.push(vac('p0','2026-09-28','2026-10-06'), vac('p0','2026-10-02','2026-10-09','confirmed','v-extra'));
  assert.equal(getPersonWeekDays(team,'p0','2026-09-28'),7);
  assert.equal(getPersonWeekDays(team,'p0','2026-10-05'),5);
});
