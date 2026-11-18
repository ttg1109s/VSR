import { test, expect } from '@playwright/test';

test('ToastProvider automatically dismisses a toast after its configured duration', async ({ page }) => {
  await page.goto('tests/browser/toast-fixture.html');
  await page.evaluate(() => window.__showToast('Transient toast', { id: 'toast-transient' }));
  const toast = page.getByRole('status').filter({ hasText: 'Transient toast' });
  await expect(toast).toBeVisible();
  await expect(toast).toBeHidden();
});

test('ToastProvider supports persistent toasts and manual dismissal', async ({ page }) => {
  await page.goto('tests/browser/toast-fixture.html');
  await page.evaluate(() => window.__showToast('Persistent toast', { id: 'toast-persistent', duration: null }));
  const toast = page.getByRole('status').filter({ hasText: 'Persistent toast' });
  await expect(toast).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await expect(toast).toBeHidden();
});

test('ToastProvider unmount removes the toast portal and cleans up pending dismissal timers', async ({ page }) => {
  await page.goto('tests/browser/toast-fixture.html');
  await page.evaluate(() => window.__showToast('Unmounted toast', { id: 'toast-unmount', duration: 1000 }));
  await expect(page.getByText('Unmounted toast')).toBeVisible();
  await page.evaluate(() => window.__unmountToastRoot());
  await expect(page.getByText('Unmounted toast')).toHaveCount(0);
});
