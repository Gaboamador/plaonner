import { test, expect } from '@playwright/test';

const plan = {
  version: 1,
  plan: {
    availableDays: 47,
    breaks: 1,
    segments: [{ start: null, end: null }, { start: null, end: null }],
    holidays: {},
    viewMonth: '2026-10',
  },
};

async function seededPage(page) {
  await page.goto('/');
  await page.evaluate(value => localStorage.setItem('plaonner.planning.v1', JSON.stringify(value)), plan);
  await page.reload();
}

test('selección inicio y fin conserva 47 días al recargar', async ({ page }) => {
  await seededPage(page);
  await page.locator('[data-iso="2026-10-12"]').click();
  await expect(page.locator('#selectionTitle')).toContainText('FIN');
  await page.getByRole('button', { name: 'Mes siguiente' }).click();
  await page.locator('[data-iso="2026-11-27"]').click();
  await expect(page.locator('#usedDays')).toHaveText('47');
  await expect(page.locator('#remainingDays')).toHaveText('0');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('plaonner.planning.v1')).plan.segments[0].end)).toBe('2026-11-27');
  await page.reload();
  await expect(page.locator('#usedDays')).toHaveText('47');
  await expect(page.getByLabel('Inicio del tramo 1')).toHaveValue('2026-10-12');
  await expect(page.getByLabel('Fin del tramo 1')).toHaveValue('2026-11-27');
});

test('editar fecha del inicio señala FIN y borra un fin incompatible', async ({ page }) => {
  await seededPage(page);
  await page.getByLabel('Inicio del tramo 1').fill('2026-10-12');
  await page.getByLabel('Fin del tramo 1').fill('2026-10-20');
  await page.getByLabel('Inicio del tramo 1').fill('2026-10-25');
  await expect(page.getByLabel('Fin del tramo 1')).toHaveValue('');
  await expect(page.locator('#selectionTitle')).toContainText('FIN');
});

test('feriado se conserva tras refrescar y se puede quitar', async ({ page }) => {
  await seededPage(page);
  await page.getByRole('button', { name: 'Feriados', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nombre del feriado' }).fill('Feriado de prueba');
  await page.locator('[data-iso="2026-10-12"]').click();
  await expect(page.locator('#holidayCount')).toHaveText('1');
  await page.reload();
  await expect(page.locator('#holidayCount')).toHaveText('1');
  await page.getByRole('button', { name: 'Quitar feriado del 12/10/2026' }).click();
  await expect(page.locator('#holidayCount')).toHaveText('0');
});

test('reiniciar borra el almacenamiento y deja valores iniciales', async ({ page }) => {
  await seededPage(page);
  await page.getByLabel('Días disponibles').fill('20');
  await page.getByRole('button', { name: 'Borrar datos y reiniciar' }).click();
  await page.getByRole('button', { name: 'Sí, borrar todo' }).click();
  await expect(page.getByLabel('Días disponibles')).toHaveValue('47');
  await expect(page.getByText('Sin datos guardados todavía')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('plaonner.planning.v1'))).toBeNull();
});
