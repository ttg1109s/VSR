import { test, expect } from '@playwright/test';

test('nested dialogs keep Escape and focus ownership on the topmost overlay', async ({ page }) => {
  await page.goto('tests/browser/overlay-fixture.html');
  const opener = page.locator('#outer-trigger');

  await opener.click();
  const outer = page.getByRole('dialog', { name: 'Outer dialog' });
  await expect(outer).toBeVisible();
  await expect(outer.locator('.vsr-overlay-header button')).toBeFocused();
  await expect(outer).toHaveAttribute('aria-modal', 'true');

  await page.locator('#nested-trigger').click();
  const nested = page.getByRole('dialog', { name: 'Nested dialog' });
  await expect(nested).toBeVisible();
  await expect(nested.locator('.vsr-overlay-header button')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(nested).toHaveCount(0);
  await expect(outer).toBeVisible();
  await expect(page.locator('#nested-trigger')).toBeFocused();

  await page.locator('.vsr-overlay-panel[aria-labelledby]').first().locator('.vsr-overlay-header button').focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#outer-action')).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(outer).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test('Menu reports open, Escape, outside-click and item-selection state changes', async ({ page }) => {
  await page.goto('tests/browser/overlay-fixture.html');
  const trigger = page.locator('#menu-trigger');
  const state = page.locator('#menu-state');

  await trigger.click();
  await expect(state).toHaveText('true');
  await expect(page.getByRole('menuitem', { name: 'First item' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(state).toHaveText('false');
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.locator('#outside').click();
  await expect(state).toHaveText('false');

  await trigger.click();
  await page.getByRole('menuitem', { name: 'First item' }).click();
  await expect(state).toHaveText('false');
});

test('Dialog remains within a compact mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('tests/browser/overlay-fixture.html');
  await page.locator('#outer-trigger').click();

  const dialog = page.getByRole('dialog', { name: 'Outer dialog' });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
});
