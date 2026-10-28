import { expect, test, type Page } from '@playwright/test';

type Lang = 'ar' | 'en';

const student = {
  email: process.env.E2E_STUDENT_EMAIL ?? 'student1@demo.om',
  password: process.env.E2E_STUDENT_PASSWORD ?? 'demo-password',
};

const parent = {
  email: process.env.E2E_PARENT_EMAIL ?? 'parent1@demo.om',
  password: process.env.E2E_PARENT_PASSWORD ?? 'demo-password',
};

const labels = {
  ar: {
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    submit: 'تسجيل الدخول',
    welcome: /^مرحباً /,
    lessons: 'الدروس',
    quiz: 'اختبار قصير',
    myChildren: 'أبنائي',
    viewGrades: 'عرض الدرجات',
    switchToEnglish: 'التبديل إلى الإنجليزية',
  },
  en: {
    email: 'Email',
    password: 'Password',
    submit: 'Log in',
    welcome: /^Welcome /,
    lessons: 'Lessons',
    quiz: 'Quiz',
    myChildren: 'My children',
    viewGrades: 'View grades',
    switchToEnglish: 'Switch to English',
  },
} as const;

async function openInLang(page: Page, lang: Lang, path = '/login') {
  await page.addInitScript((value) => localStorage.setItem('lang', value), lang);
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
  await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
}

async function login(page: Page, email: string, password: string, lang: Lang) {
  await page.getByLabel(labels[lang].email).fill(email);
  await page.getByLabel(labels[lang].password).fill(password);
  await page.getByRole('button', { name: labels[lang].submit }).click();
}

for (const lang of ['ar', 'en'] as const) {
  test(`student (${lang}): login -> dashboard -> group -> lesson -> quiz`, async ({ page }) => {
    await openInLang(page, lang);
    await login(page, student.email, student.password, lang);

    await expect(page.getByRole('heading', { name: labels[lang].welcome })).toBeVisible();
    await page.getByRole('link', { name: /Physics — Grade 10/ }).first().click();

    await expect(page.getByRole('heading', { name: 'Physics — Sun Tue' })).toBeVisible();
    await page.getByRole('button', { name: labels[lang].lessons, exact: true }).click();

    await page.getByRole('link', { name: /Speed & velocity/ }).click();
    await expect(
      page.getByRole('heading', { name: `${labels[lang].quiz}: Speed & velocity — Quiz`, exact: true }),
    ).toBeVisible();
  });

  test(`parent (${lang}): login -> linked child -> grades`, async ({ page }) => {
    await openInLang(page, lang);
    await login(page, parent.email, parent.password, lang);

    await expect(page.getByRole('heading', { name: labels[lang].myChildren })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Student 1', exact: true })).toBeVisible();

    await page.getByRole('button', { name: labels[lang].viewGrades }).first().click();
    await expect(page.getByText(labels[lang].quiz, { exact: true })).toBeVisible();
  });
}

test('public teacher landing lists published courses', async ({ page }) => {
  await page.goto('/t/salim');
  await expect(page.getByRole('heading', { name: 'Salim Al Balushi', exact: true })).toBeVisible();
  await expect(page.getByText('Physics — Grade 10')).toBeVisible();
});

test('language toggle switches Arabic to English and ltr', async ({ page }) => {
  await openInLang(page, 'ar');
  await expect(page.getByRole('heading', { name: 'تسجيل الدخول' })).toBeVisible();

  await page.getByRole('button', { name: labels.ar.switchToEnglish }).click();

  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
});
