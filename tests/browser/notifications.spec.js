import { test, expect } from '@playwright/test';

test('Tapping a notification marks it read without showing per-item action buttons', async ({ page }) => {
  await page.goto('tests/browser/notification-fixture.html');
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible();
  const item = page.locator('.vsr-notification-item').filter({ hasText: 'Unread system notice' });
  await expect(item.getByRole('button')).toHaveCount(0);
  await item.click();
  await expect.poll(() => page.evaluate(() => window.__notifyCalls)).toContainEqual(['read', 'n1']);
});

test('A touch swipe dismisses a notification', async ({ page }) => {
  await page.goto('tests/browser/notification-fixture.html');
  const item = page.locator('.vsr-notification-item').filter({ hasText: 'Unread system notice' });
  const bounds = await item.boundingBox();
  await item.evaluate((element, rect) => {
    element.setPointerCapture = () => {};
    const startX = rect.x + rect.width - 24;
    const endX = rect.x + 24;
    const y = rect.y + rect.height / 2;
    element.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true,
      clientX: startX, clientY: y
    }));
    element.dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, pointerId: 7, pointerType: 'touch', isPrimary: true,
      clientX: endX, clientY: y
    }));
  }, bounds);
  await expect.poll(() => page.evaluate(() => window.__notifyCalls)).toContainEqual(['dismiss', 'n1']);
});

test('Notification filters use trusted source, not category metadata', async ({ page }) => {
  await page.goto('tests/browser/notification-fixture.html');
  const filters = page.getByRole('group', { name: 'Filter notifications' });
  await filters.getByRole('button', { name: 'Story' }).click();
  await expect(page.getByText('Story update')).toBeVisible();
  await expect(page.getByText('Engine notice with Story category')).toHaveCount(0);
  await expect(page.getByText('Unread system notice')).toHaveCount(0);
  await filters.getByRole('button', { name: 'System' }).click();
  await expect(page.getByText('Unread system notice')).toBeVisible();
  await expect(page.getByText('Engine notice with Story category')).toBeVisible();
  await expect(page.getByText('Story update')).toHaveCount(0);
  await filters.getByRole('button', { name: 'All' }).click();
  await page.getByRole('button', { name: 'Mark all as read' }).click();
  await expect.poll(() => page.evaluate(() => window.__notifyCalls)).toContainEqual(['read-all']);
});

test('Notification Drawer fits compact and medium viewports without horizontal overflow', async ({ page }) => {
  for (const viewport of [{ width: 360, height: 740 }, { width: 768, height: 900 }, { width: 1280, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto('tests/browser/notification-fixture.html');
    const dialog = page.getByRole('dialog', { name: 'Notifications' });
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
  }
});

test('Unread notification remains independently keyboard operable', async ({ page }) => {
  await page.goto('tests/browser/notification-fixture.html');
  const item = page.getByRole('button', { name: 'Mark Unread system notice as read' });
  await item.focus();
  await expect(item).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => window.__notifyCalls)).toContainEqual(['read', 'n1']);
});
