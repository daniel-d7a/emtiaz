import { expect, test } from '@playwright/test';

const student = {
  email: process.env.E2E_STUDENT_EMAIL ?? 'student1@demo.om',
  password: process.env.E2E_STUDENT_PASSWORD ?? 'demo-password',
};

test('student: login -> group -> lesson -> quiz', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('البريد الإلكتروني').fill(student.email);
  await page.getByLabel('كلمة المرور').fill(student.password);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

  await expect(page.getByRole('heading', { name: 'مقرراتي' })).toBeVisible();
  await page.getByText('Physics — Grade 10').first().click();
  await expect(page.getByRole('heading', { name: 'Physics — Sun Tue' })).toBeVisible();

  await page.getByRole('button', { name: 'Speed & velocity' }).click();
  await expect(page.getByText('Speed & velocity — Quiz')).toBeVisible();
});
