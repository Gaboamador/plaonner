import { test, expect } from '@playwright/test';

const seed = {
  version: 2,
  plan: {
    availableDays: 47, breaks: 1,
    segments: [{ start: '2026-10-12', end: '2026-11-27' }, { start: null, end: null }],
    viewMonth: '2026-11', holidays: {},
    team: {
      responsibilities: [
        { id: 'rA', name: 'Atención', minCoverage: 1 },
        { id: 'rB', name: 'Informes', minCoverage: 1 },
        { id: 'rC', name: 'Liquidación', minCoverage: 1 },
      ],
      people: Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, name: `Persona ${i}`, responsibilityIds: [i < 3 ? 'rA' : i < 6 ? 'rB' : 'rC'] })),
      vacations: [0,1,3,4,6,7,8].map(i => ({ id: `v${i}`, personId: `p${i}`, start: '2026-11-02', end: '2026-11-06', status: 'confirmed' })),
    },
  },
};
async function visitWithSeed(page, input=seed) {
  await page.goto('/');
  await page.evaluate(value => localStorage.setItem('plaonner.planning.v1', JSON.stringify(value)), input);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Equipo', exact: true })).toHaveAttribute('aria-pressed','true');
}

test('el módulo individual conserva sus 47 días y el equipo detecta cobertura válida con 7 ausentes', async ({ page }) => {
  await visitWithSeed(page);
  await expect(page.getByText('Organización del equipo')).toBeVisible();
  await expect(page.getByText('Ninguna responsabilidad queda por debajo de su mínimo')).toBeVisible();
  await expect(page.getByText('3 de 10 personas disponibles')).toBeVisible();
  await page.getByRole('button', { name: 'Mis vacaciones' }).click();
  await expect(page.locator('#usedDays')).toHaveText('47');
  await page.reload();
  await page.getByRole('button', { name: 'Mis vacaciones' }).click();
  await expect(page.locator('#usedDays')).toHaveText('47');
});

test('la simulación advierte cuando se propone confirmar el último integrante de Atención', async ({ page }) => {
  await visitWithSeed(page);
  await page.getByRole('button', { name: '+ Cargar vacaciones' }).click();
  await page.getByRole('combobox', { name: 'Persona de vacaciones' }).selectOption('p2');
  await page.getByLabel('Inicio de vacaciones de equipo').fill('2026-11-02');
  await page.getByLabel('Fin de vacaciones de equipo').fill('2026-11-06');
  await expect(page.getByText('5 días con cobertura insuficiente')).toBeVisible();
  await expect(page.getByText('Responsabilidades afectadas: Atención')).toBeVisible();
  await page.getByRole('combobox', { name: 'Estado del período' }).selectOption('tentative');
  await page.getByRole('button', { name: 'Guardar período' }).click();
  await expect(page.getByText('Ninguna responsabilidad queda por debajo de su mínimo')).toBeVisible();
  await page.getByRole('button', { name: 'Personas y tareas' }).click();
  await page.getByRole('button', { name: 'Editar' }).last().click();
  await page.getByRole('combobox', { name: 'Estado del período' }).selectOption('confirmed');
  await page.getByRole('button', { name: 'Guardar período' }).click();
  await page.getByRole('button', { name: 'Calendario y resumen' }).click();
  await expect(page.getByText('5 días sin cobertura')).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('plaonner.planning.v1')).plan.team.vacations.length)).toBe(8);
  await page.reload();
  await page.getByRole('button', { name: 'Equipo', exact: true }).click();
  await expect(page.getByText('5 días sin cobertura')).toBeVisible();
});

test('grilla semanal refleja cinco días confirmados por cada integrante ausente', async ({ page }) => {
  await visitWithSeed(page);
  await page.getByRole('button', { name: 'Por semana' }).click();
  await expect(page.getByRole('region', { name: 'Resumen semanal por persona' })).toBeVisible();
  const firstRow = page.locator('table tbody tr').first();
  await expect(firstRow).toContainText('Persona 0');
  await expect(firstRow).toContainText('5');
  await page.getByRole('combobox', { name: 'Filtrar por responsabilidad' }).selectOption('rC');
  await expect(page.getByRole('region', { name: 'Resumen semanal por persona' }).locator('tbody tr')).toHaveCount(4);
});

test('se pueden crear equipos con cantidad editable de personas y responsables', async ({ page }) => {
  await visitWithSeed(page, { version:1, plan: { availableDays: 25, breaks:0, segments:[{start:null,end:null}], holidays:{}, viewMonth:'2026-11' } });
  await page.getByRole('button', { name: 'Personas y tareas' }).click();
  await page.getByRole('button', { name: '+ Nueva' }).first().click();
  await page.getByPlaceholder('Ej.: Atención al público').fill('Tarea principal');
  await page.getByRole('button', { name: 'Guardar responsabilidad' }).click();
  await page.getByRole('button', { name: '+ Nueva' }).last().click();
  await page.getByPlaceholder('Ej.: Juan Pérez').fill('Nueva persona');
  await page.getByRole('checkbox', { name: 'Tarea principal' }).check();
  await page.getByRole('button', { name: 'Guardar persona' }).click();
  await expect(page.getByText('Nueva persona')).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('plaonner.planning.v1')).plan.team.people.length)).toBe(1);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('plaonner.planning.v1')).version)).toBe(2);
});

test('regresión: grilla semanal muestra 7 y 5 días corridos para 28/09–09/10', async ({ page }) => {
  const data = structuredClone(seed);
  data.plan.viewMonth = '2026-10';
  data.plan.team.vacations = [{id:'sep-oct',personId:'p0',start:'2026-09-28',end:'2026-10-09',status:'confirmed'}];
  data.plan.holidays = {'2026-10-02':'Feriado de ejemplo'};
  await visitWithSeed(page,data);
  await page.getByRole('button',{name:'Por semana'}).click();
  const row = page.getByRole('region',{name:'Resumen semanal por persona'}).locator('tbody tr').first();
  await expect(row.locator('td').nth(0)).toContainText('7');
  await expect(row.locator('td').nth(1)).toContainText('5');
  await expect(row.locator('td').last()).toContainText('12');
  await expect(page.getByText('Los días son corridos: sábados, domingos y feriados incluidos.')).toBeVisible();
});

test('Equipo abre por defecto, el selector se desliza y los controles navegan junto al calendario', async ({ page }) => {
  await visitWithSeed(page);
  const nav = page.getByRole('navigation',{name:'Secciones de Plaonner'});
  const teamButton = nav.getByRole('button',{name:'Equipo'});
  const personalButton = nav.getByRole('button',{name:'Mis vacaciones'});
  await expect(teamButton).toHaveAttribute('aria-pressed','true');
  await expect(personalButton).toHaveAttribute('aria-pressed','false');
  await expect(page.getByRole('heading',{name:/noviembre de 2026/i})).toBeVisible();
  await page.getByRole('button',{name:'Mes siguiente del equipo'}).click();
  await expect(page.getByRole('heading',{name:/diciembre de 2026/i})).toBeVisible();
  await page.getByRole('button',{name:'Mes anterior del equipo'}).click();
  await expect(page.getByRole('heading',{name:/noviembre de 2026/i})).toBeVisible();
  const before = await nav.evaluate(el => getComputedStyle(el,'::before').transform);
  const duration = await nav.evaluate(el => getComputedStyle(el,'::before').transitionDuration);
  expect(duration).not.toBe('0s');
  await personalButton.click();
  await expect(personalButton).toHaveAttribute('aria-pressed','true');
  await expect.poll(() => nav.evaluate(el => getComputedStyle(el,'::before').transform)).not.toBe(before);
  await teamButton.click();
  await expect(teamButton).toHaveAttribute('aria-pressed','true');
});


test('la grilla semanal conserva el alto compacto de filas de la diaria', async ({ page }) => {
  await visitWithSeed(page);
  const dailyRow = page.getByRole('region', { name: /Calendario diario del equipo/ }).locator('tbody tr').first();
  const dailyHeight = await dailyRow.evaluate(el => el.getBoundingClientRect().height);
  await page.getByRole('button', { name: 'Por semana' }).click();
  const weeklyRow = page.getByRole('region', { name: 'Resumen semanal por persona' }).locator('tbody tr').first();
  const weeklyHeight = await weeklyRow.evaluate(el => el.getBoundingClientRect().height);
  expect(weeklyHeight).toBeLessThanOrEqual(dailyHeight + 1);
  expect(weeklyHeight).toBeGreaterThanOrEqual(dailyHeight - 1);
});

test('los controles del calendario permiten saltar a otro mes y volver al actual desde ambas vistas', async ({ page }) => {
  await visitWithSeed(page);
  const jump = page.getByLabel('Ir al mes del equipo');
  await jump.fill('2028-03');
  await expect(page.getByRole('heading', { name: /marzo de 2028/i })).toBeVisible();
  await page.getByRole('button', { name: 'Por semana' }).click();
  await expect(jump).toHaveValue('2028-03');
  await page.getByRole('button', { name: 'Mes siguiente del equipo' }).click();
  await expect(jump).toHaveValue('2028-04');
  await page.getByRole('button', { name: 'Ir al mes actual del equipo' }).click();
  const actualMonth = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, '0')}`;
  });
  await expect(jump).toHaveValue(actualMonth);
  await page.getByRole('button', { name: 'Por día' }).click();
  await expect(jump).toHaveValue(actualMonth);
});
