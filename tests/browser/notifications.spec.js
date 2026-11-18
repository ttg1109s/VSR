import { test, expect } from '@playwright/test';

test('Notification Center exposes semantic mark-read and dismiss actions', async ({ page }) => {
  await page.goto('tests/browser/notification-fixture.html');
  await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark Unread system notice as read' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Dismiss Unread system notice' })).toBeVisible();
  await page.getByRole('button', { name: 'Mark Unread system notice as read' }).click();
  await expect.poll(() => page.evaluate(() => window.__notifyCalls)).toContainEqual(['read', 'n1']);
});

test('Notification filters and mark-all-read use accessible shared controls', async ({ page }) => {
  await page.goto('tests/browser/notification-fixture.html');
  const filters = page.getByRole('group', { name: 'Filter notifications' });
  await filters.getByRole('button', { name: 'Story' }).click();
  await expect(page.getByText('Story update')).toBeVisible();
  await expect(page.getByText('Unread system notice')).toHaveCount(0);
  await filters.getByRole('button', { name: 'All' }).click();
  await page.getByRole('button', { name: 'Mark all as read' }).click();
  await expect.poll(() => page.evaluate(() => window.__notifyCalls)).toContainEqual(['read-all']);
});

test('Notification Drawer fits compact and medium viewports without horizontal overflow', async ({ page }) => {
  for (const viewport of [{ width: 360, height: 740 }, { width: 768, height: 900 }]) {
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
