import { expect, test } from '@playwright/test';

test('seed → checks → success → blocked → export', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await page.goto('/#/review');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Seeded clean contract under Fernbrook: every clause is within playbook.
  const clauses = page.getByRole('navigation', { name: 'Clauses' });
  await expect(clauses.getByText('Within playbook')).toHaveCount(4);
  await expect(page.getByText('FB-LC-01').first()).toBeVisible();

  // Successful result: auto-accept the liability cap.
  await page.getByRole('button', { name: 'Auto-accept' }).click();
  await expect(page.locator('.current-dec')).toContainText('Decided: auto-accepted');
  await expect(page.getByLabel('Audit trail').getByText('auto accepted')).toBeVisible();

  // Playbook switch changes the recommendation.
  await page.getByRole('combobox', { name: 'Playbook', exact: true }).selectOption('quayside');
  await clauses.getByRole('button', { name: /19\. Governing law/ }).click();
  await expect(page.getByText(/No rule for governing law/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Auto-accept' })).toBeDisabled();

  // Blocked exception: conflicting Alder indemnity rules.
  await page.getByRole('combobox', { name: 'Contract', exact: true }).selectOption('brightwater');
  await page.getByRole('combobox', { name: 'Playbook', exact: true }).selectOption('alder');
  await clauses.getByRole('button', { name: /12\. Indemnities/ }).click();
  await expect(page.locator('.rec')).toContainText('two playbook rules give different answers');
  await expect(page.getByText('AH-IN-07').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Auto-accept' })).toBeDisabled();
  await page.getByRole('button', { name: 'Accept (override)' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'needs a note' })).toBeVisible();
  await page.getByRole('button', { name: 'Reject, counter with standard' }).click();
  await expect(page.locator('.current-dec')).toContainText('Decided: rejected');

  // Edit re-evaluates the liability cap under Fernbrook.
  await page.getByRole('combobox', { name: 'Playbook', exact: true }).selectOption('fernbrook');
  await clauses.getByRole('button', { name: /11\. Limitation/ }).click();
  await page.getByRole('button', { name: 'Edit wording' }).click();
  const box = page.getByRole('textbox', { name: /Edit the proposed wording/ });
  await box.fill((await box.inputValue()).replace('twice the total fees', '100% of the fees'));
  await page.getByRole('button', { name: 'Save edit' }).click();
  await expect(page.getByLabel('Audit trail').getByText(/deviation → within/)).toBeVisible();

  // Export review memo.
  const [memo] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export review memo' }).click()]);
  expect(memo.suggestedFilename()).toBe('review-memo-brightwater-fernbrook.md');
  const memoText = await (await memo.createReadStream()).toArray();
  expect(Buffer.concat(memoText).toString()).toContain('Edited proposed wording');

  // Eval report export.
  await page.getByRole('link', { name: 'Evals' }).click();
  await expect(page.getByText('Release gate: PASS')).toBeVisible();
  const [report] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export eval report' }).click()]);
  expect(report.suggestedFilename()).toBe('eval-report.md');
  await expect(page.getByRole('status')).toContainText('eval-report.md');

  // Reset clears state.
  await page.getByRole('link', { name: 'Review' }).click();
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByLabel('Audit trail').getByText('Reset the workspace to seeded data.')).toBeVisible();
});

for (const [name, width, height] of [['desktop', 1366, 900], ['tablet', 820, 1180], ['phone', 390, 844]] as const) {
  test(`no horizontal overflow at ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    for (const hash of ['#/review', '#/evals', '#/about']) {
      await page.goto(`/${hash}`);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(sw, `${hash} at ${width}`).toBeLessThanOrEqual(width);
    }
  });
}
