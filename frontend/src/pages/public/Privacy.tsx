import { useEffect } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, CheckCircle2, Database, Eye, FileText, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { rootRoute } from '../../routes/__root';
import { useLang } from '../../lib/i18n';
import { applyPageMeta } from '../../lib/meta';
import { Badge, Card } from '../../components/ui';

export default function Privacy() {
  const { t, lang } = useLang();
  const isAr = lang === 'ar';

  useEffect(() => {
    return applyPageMeta({
      title: `${t('privacyPolicy')} — ${t('appName')}`,
      description: t('privacySubtitle'),
      type: 'website',
      locale: lang,
    });
  }, [t, lang]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft size={16} className="rtl:rotate-180" />
          {t('backToHome')}
        </Link>
        <span className="text-xs text-ink-soft">{t('lastUpdatedDate')}</span>
      </div>

      <header className="flex flex-col gap-3 border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">
            <ShieldCheck size={14} className="inline me-1" />
            {isAr ? 'الخصوصية والأمان · سلطنة عُمان ومصر' : 'Privacy & Security · Oman & Egypt'}
          </Badge>
          <Badge tone="neutral">
            {isAr ? 'حماية بيانات القُصّر' : 'Minor Data Protection'}
          </Badge>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t('privacyPolicyTitle')}
        </h1>
        <p className="text-base text-ink-soft sm:text-lg">
          {t('privacySubtitle')}
        </p>
      </header>

      {/* Core Guarantee Callout */}
      <div className="rounded-2xl border-2 border-primary/20 bg-primary-light/40 p-5 text-primary-dark shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <Lock size={24} />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-base font-bold sm:text-lg">
              {isAr ? 'ضمانة امتياز الأساسية: خصوصية البيانات حق غير قابل للتفاوض' : 'Core Emtiaz Guarantee: Zero Selling of Personal Data'}
            </h2>
            <p className="text-sm leading-relaxed sm:text-base">
              {isAr
                ? 'نلتزم التزامًا قاطعًا بعدم بيع أو تأجير أو مشاركة أو تسييل أي بيانات شخصية أو تعليمية خاصة بالطلبة أو أولياء الأمور أو المعلمين مع أي طرف ثالث لأغراض التسويق أو الإعلانات تحت أي ظرف.'
                : 'We categorically guarantee that we never sell, rent, monetize, or share student, parent, or teacher personal data with any third-party advertisers, data brokers, or marketing entities under any circumstances.'}
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Regulatory Framework */}
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <FileText size={20} className="text-primary" />
          {isAr ? '1. الإطار القانوني والامتثال التنظيمي' : '1. Regulatory Framework & Compliance'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'تلتزم منصة امتياز بأعلى معايير حماية البيانات والخصوصية المطبقة في سلطنة عُمان، وخصوصًا قانون حماية البيانات الشخصية الصادر بالمرسوم السلطاني رقم 6/2022، وقوانين حماية البيانات في جمهورية مصر العربية (القانون رقم 151 لسنة 2020). صُممت المنصة لتوفير بيئة تعليمية آمنة تصون سرية سجلات الطلبة والمعلمين وحقوقهم الرقمية.'
            : 'Emtiaz operates in full compliance with data privacy regulations in the Sultanate of Oman (Personal Data Protection Law, Royal Decree 6/2022) and the Arab Republic of Egypt (Data Protection Law 151/2020). The platform is purposefully built to safeguard educational privacy and ensure digital rights protection.'}
        </p>
      </Card>

      {/* Section 2: Minor & Student Protection */}
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <ShieldCheck size={20} className="text-primary" />
          {isAr ? '2. حماية بيانات الطلبة والقُصّر' : '2. Protection of Minors & Student Data'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'الطلبة هم محور المنصة، ولذلك تحظى سجلاتهم بحماية مضاعفة:'
            : 'Students are at the core of the learning experience; their records receive elevated safeguards:'}
        </p>
        <ul className="flex flex-col gap-3 text-sm text-ink-soft sm:text-base">
          <li className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <strong className="text-ink">{isAr ? 'عدم التتبع السلوكي أو التجاري: ' : 'No Commercial Profiling: '}</strong>
              {isAr ? 'لا نقوم بإنشاء أي ملفات تعريف شخصية للطلاب لأغراض ترويجية أو إعلانية.' : 'We never build commercial or advertising profiles on students.'}
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <strong className="text-ink">{isAr ? 'حصر الرؤية الأكاديمية: ' : 'Restricted Cohort Visibility: '}</strong>
              {isAr ? 'نتائج الاختبارات والواجبات وسجلات الحضور تكون مرئية حصرًا لمعلم المجموعة ولولي أمر الطالب المرتبط رسميًا.' : 'Grades, attendance, and homework evaluations are strictly restricted to the course teacher and the verified linked parent.'}
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <strong className="text-ink">{isAr ? 'أمان التواصل المغلق: ' : 'Safe Closed Environment: '}</strong>
              {isAr ? 'لا يمكن لأي جهة خارجية أو طلبة من خارج المجموعة الوصول إلى بيانات الطالب أو الاتصال به.' : 'No external parties or unlinked students can view student records or contact students.'}
            </div>
          </li>
        </ul>
      </Card>

      {/* Section 3: Data We Collect */}
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <Database size={20} className="text-primary" />
          {isAr ? '3. البيانات التي نجمعها' : '3. Information We Collect'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr ? 'نجمع فقط الحد الأدنى اللازم لتشغيل الخدمة التعليمية بكفاءة:' : 'We collect only the minimal data strictly necessary to provide our educational service:'}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="mb-1 text-sm font-bold text-ink">{isAr ? 'بيانات الحساب' : 'Account Details'}</h3>
            <p className="text-xs leading-relaxed text-ink-soft">
              {isAr
                ? 'الاسم الكامل، رقم الهاتف، كلمة المرور المشفرة بتجزئة غير قابلة للعكس، والبريد الإلكتروني (إلزامي للمعلم واختياري للطلبة وأولياء الأمور).'
                : 'Full name, phone number, cryptographically hashed passwords, and email (mandatory for teachers, optional for students/parents).'}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="mb-1 text-sm font-bold text-ink">{isAr ? 'السجلات الأكاديمية' : 'Academic Records'}</h3>
            <p className="text-xs leading-relaxed text-ink-soft">
              {isAr
                ? 'الصف والمقرر الدراسي، المجموعات المنضم إليها، إجابات الاختبارات المصححة، وملفات تسليم الواجبات.'
                : 'Grade level, enrolled cohorts, quiz submissions, scores, and homework file uploads.'}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="mb-1 text-sm font-bold text-ink">{isAr ? 'سجلات الأمان الفنية' : 'Security Logs'}</h3>
            <p className="text-xs leading-relaxed text-ink-soft">
              {isAr
                ? 'عنوان IP وتوقيت الجلسات ونشاطات النظام الإدارية، بهدف حماية الحسابات وسجل التدقيق (Audit Log).'
                : 'IP address, session timestamps, and administrative audit logging strictly to protect account security.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Section 4: Parent Read-Only Access */}
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <Eye size={20} className="text-primary" />
          {isAr ? '4. حدود وصول أولياء الأمور (اطلاع وقراءة فقط)' : '4. Parent Read-Only Access Boundaries'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'تتيح المنصة لأولياء الأمور ربط حساباتهم بأبنائهم عبر رقم هاتف الطالب المسجل أو رمز المتابعة الفريد (QR / Monitoring Code). وتكون صلاحيات ولي الأمر محددة بدقة في وضع القراءة والاطلاع فقط (Read-Only):'
            : 'Parents can link their accounts to their children via student phone number or an 8-character monitoring code. Parent permissions are strictly read-only:'}
        </p>
        <div className="rounded-xl bg-line/30 p-4 text-sm leading-relaxed text-ink">
          <p>
            {isAr
              ? 'يستطيع ولي الأمر متابعة نسبة إنجاز الدروس، ودرجات الاختبارات القصيرة، وملاحظات الواجبات، وسجل الحضور والغياب. لا يمكن لولي الأمر تعديل إجابات الاختبارات أو رفع واجبات نيابة عن الطالب أو التدخل في سجل الدرجات.'
              : 'Parents can view lesson progress, quiz scores, assignment remarks, and attendance history. Parents cannot submit homework, alter quiz answers, or modify academic gradebooks.'}
          </p>
        </div>
      </Card>

      {/* Section 5: Media Storage & Encryption (Cloudflare R2) */}
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <Lock size={20} className="text-primary" />
          {isAr ? '5. تخزين الوسائط والتشفير السحابي (Cloudflare R2)' : '5. Cloudflare R2 Media Storage & Encryption'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'يتم تخزين ملفات المقررات والوسائط التعليمية في مخزن سحابي مخصص (Cloudflare R2) يتميز بأعلى معايير الأمان الدولية:'
            : 'Course attachments, worksheets, and media are hosted in Cloudflare R2 object storage adhering to international enterprise standards:'}
        </p>
        <ul className="flex flex-col gap-2.5 text-sm text-ink-soft sm:text-base">
          <li>
            • <strong className="text-ink">{isAr ? 'التشفير أثناء النقل وأثناء السكون: ' : 'Encryption in Transit & at Rest: '}</strong>
            {isAr ? 'جميع الاتصالات مشفرة ببروتوكول TLS 1.3، والملفات المخزنة مشفرة بتشفير AES-256 القياسي.' : 'TLS 1.3 encryption in transit and AES-256 at-rest encryption for all stored files.'}
          </li>
          <li>
            • <strong className="text-ink">{isAr ? 'روابط وصول موقّعة ومحمية: ' : 'Signed, Time-Limited URLs: '}</strong>
            {isAr ? 'الملفات المرفوعة لا تُتاح للعامة بل عبر روابط موقّعة تنتهي صلاحيتها زمنيًا وتتحقق من تسجيل الطالب.' : 'File access is granted exclusively through secure time-limited signed links verifying student enrollment.'}
          </li>
          <li>
            • <strong className="text-ink">{isAr ? 'سياسة استبقاء وحذف البيانات: ' : 'Retention & Deletion Policy: '}</strong>
            {isAr ? 'تُحفظ الوسائط طوال فترة نشاط المجموعة التعليمية، وتُحذف نهائيًا فور انتهاء الدورة أو بناءً على طلب المعلم.' : 'Media is retained during cohort activity and deleted upon cohort archiving or teacher request.'}
          </li>
        </ul>
      </Card>

      {/* Section 6: User Rights */}
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <UserCheck size={20} className="text-primary" />
          {isAr ? '6. حقوق المستخدم: الوصول، والتصدير، والحذف' : '6. User Rights: Access, Export & Deletion'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'يتمتع كل مستخدم (أو ولي أمره القانوني) بحقوق رقمية كاملة وفق القوانين المعمول بها:'
            : 'Every user (or parent/guardian on behalf of a minor student) possesses full digital rights:'}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="mb-1 text-sm font-bold text-ink">{isAr ? 'حق الاطلاع والوصول' : 'Right to Access'}</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              {isAr ? 'معاينة كافة البيانات الشخصية وسجل الدرجات والأنشطة عبر لوحة التحكم.' : 'View all personal profile data, marks, and activities at any time.'}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="mb-1 text-sm font-bold text-ink">{isAr ? 'حق التصدير والنقل' : 'Data Portability'}</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              {isAr ? 'طلب نسخة رقمية من السجلات والدرجات بصيغة قياسية (CSV / JSON).' : 'Request an export of academic progress and grades in portable formats.'}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="mb-1 text-sm font-bold text-ink">{isAr ? 'حق الحذف والنسيان' : 'Right to be Forgotten'}</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              {isAr ? 'طلب الحذف الكامل والنهائي للحساب ومحو كافة البيانات المرتبطة به عبر الدعم.' : 'Request complete and permanent deletion of your account and personal records.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Section 7: Security Measures */}
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <Lock size={20} className="text-primary" />
          {isAr ? '7. التدابير الأمنية لحماية الحسابات' : '7. Platform Security Safeguards'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'نستخدم أحدث التقنيات الدفاعية لحماية النظام، بما في ذلك تجزئة كلمات المرور باستخدام خوارزميات أمان حديثة، ملفات تعريف ارتباط للجلسات مع إعدادات HttpOnly و SameSite الصارمة، والتحقق الصارم من الصلاحيات القائم على الأدوار (RBAC)، بالإضافة إلى تدقيق إداري دقيق لجميع العمليات الحساسة.'
            : 'We implement rigorous defense-in-depth measures including advanced password hashing algorithms, HttpOnly SameSite session cookies, strict Role-Based Access Control (RBAC), and exhaustive administrative audit logging for all critical operations.'}
        </p>
      </Card>

      {/* Section 8: Legal Inquiries */}
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-lg font-bold text-ink">
          {isAr ? '8. الاستفسارات وحقوق الخصوصية' : '8. Inquiries & Privacy Contact'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'لأي استفسارات قانونية أو لممارسة حقك في تصدير أو حذف بياناتك، يمكنك التواصل مع فريق الدعم والإشراف عبر واتساب أو البريد الإلكتروني الرسمي لمنصة امتياز.'
            : 'For legal questions or to exercise your rights to export or delete your personal data, please reach out to our platform administration team via WhatsApp or official email.'}
        </p>
      </Card>
    </div>
  );
}

export const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
  component: Privacy,
});
