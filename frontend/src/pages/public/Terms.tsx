import { useEffect } from 'react';
import { createRoute, Link } from '@tanstack/react-router';
import { AlertTriangle, ArrowLeft, Award, CheckCircle2, CreditCard, FileCheck, FileText, Scale, ShieldAlert, Sparkles } from 'lucide-react';
import { rootRoute } from '../../routes/__root';
import { useLang } from '../../lib/i18n';
import { applyPageMeta } from '../../lib/meta';
import { Badge, Card } from '../../components/ui';

export default function Terms() {
  const { t, lang } = useLang();
  const isAr = lang === 'ar';

  useEffect(() => {
    return applyPageMeta({
      title: `${t('termsOfService')} — ${t('appName')}`,
      description: t('termsSubtitle'),
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
            <Scale size={14} className="inline me-1" />
            {isAr ? 'الاتفاقية القانونية · منصة امتياز' : 'Legal Agreement · Emtiaz Platform'}
          </Badge>
          <Badge tone="secondary">
            {isAr ? 'حقوق الملكية الفكرية والاشتراكات' : 'Intellectual Property & Subscriptions'}
          </Badge>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t('termsOfServiceTitle')}
        </h1>
        <p className="text-base text-ink-soft sm:text-lg">
          {t('termsSubtitle')}
        </p>
      </header>

      {/* Summary Highlight Callout */}
      <div className="rounded-2xl border-2 border-secondary/20 bg-secondary-light/40 p-5 text-ink shadow-sm sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-white">
            <Sparkles size={24} />
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-base font-bold text-ink sm:text-lg">
              {isAr ? 'أهم البنود باختصار' : 'Key Principles at a Glance'}
            </h2>
            <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
              {isAr
                ? 'المنصة مجانية دائمًا 100% للطلبة وأولياء الأمور بدون أي رسوم خفية. يحتفظ المعلم بكامل حقوق الملكية الفكرية لمقرراته ومحتواه. باقات المعلمين التجريبية مجانية بالكامل دون الحاجة لبطاقة دفع.'
                : 'Emtiaz is 100% free forever for students and parents. Teachers retain full intellectual property ownership of their materials. Promotional teacher tiers offer full free trials with no payment card required.'}
            </p>
          </div>
        </div>
      </div>

      {/* Section 1: Acceptance & Account Security */}
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <FileCheck size={20} className="text-primary" />
          {isAr ? '1. قبول الشروط وأهلية الحساب' : '1. Acceptance of Terms & Eligibility'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'بإنشاء حساب أو استخدام منصة امتياز بأي صفة (معلم أو طالب أو ولي أمر)، فإنك تقر وتوافق على الالتزام بجميع بنود هذه الشروط وسياسة الخصوصية التابعة لها. يشترط تقديم بيانات صحيحة ومحدثة عند التسجيل.'
            : 'By registering or utilizing Emtiaz (as a teacher, student, or parent), you agree to be bound by these Terms of Service and our Privacy Policy. You must supply accurate credentials during registration.'}
        </p>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'يتحمل كل مستخدم مسؤولية الحفاظ على سرية بيانات تسجيل الدخول الخاصة به. في حال قيام الإدارة بإعادة تعيين كلمة المرور وإصدار كلمة مرور مؤقتة، يلزم المستخدم بتغييرها فور الدخول لضمان أمان حسابه.'
            : 'Users are strictly responsible for maintaining credential confidentiality. When platform administrators issue a temporary reset password, the user must update it immediately upon logging in.'}
        </p>
      </Card>

      {/* Section 2: 100% Free Guarantee for Students & Parents */}
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <Award size={20} className="text-primary" />
          {isAr ? '2. ضمانة مجانية المنصة للطلبة وأولياء الأمور' : '2. 100% Free Guarantee for Students & Parents'}
        </h2>
        <div className="rounded-xl border border-primary/30 bg-primary-light/30 p-4">
          <p className="text-sm font-semibold text-primary-dark sm:text-base">
            {isAr
              ? 'تضمن منصة امتياز أن خدماتها التعليمية للطلبة وأولياء الأمور مجانية تمامًا وبلا أي مقابل مالي أو رسوم اشتراك، ولا يُطلب منهم إدخال أي وسيلة دفع أبدًا.'
              : 'Emtiaz guarantees that educational access for students and parents is completely free of charge. No student or parent is ever asked for payment credentials or subscription fees.'}
          </p>
        </div>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'يشمل ذلك الانضمام إلى مجموعات المعلمين برمز الدعوة، وتصفح الدروس المفتوحة، وتقديم حلول الواجبات والاختبارات، ومتابعة سجل الدرجات والتقارير الأكاديمية.'
            : 'This includes joining cohorts via invite codes, viewing unlocked materials, taking self-grading quizzes, uploading homework assignments, and inspecting live gradebooks.'}
        </p>
      </Card>

      {/* Section 3: Teacher IP & Copyright Ownership */}
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <FileText size={20} className="text-primary" />
          {isAr ? '3. حقوق الملكية الفكرية ومحتوى المعلم' : '3. Teacher Intellectual Property & Curriculum Copyright'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'نولي حقوق المعلمين الفكرية أقصى درجات الاحترام والتقدير:'
            : 'We hold educators’ creative labor and curriculum ownership in the highest regard:'}
        </p>
        <ul className="flex flex-col gap-3 text-sm text-ink-soft sm:text-base">
          <li className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <strong className="text-ink">{isAr ? 'ملكية المعلم الكاملة 100%: ' : '100% Teacher Ownership: '}</strong>
              {isAr
                ? 'يحتفظ المعلم بملكيته الفكرية وحقوق النشر الكاملة لجميع المقررات والدروس والملفات والوسائط وبنوك الأسئلة التي يقوم بإعدادها أو رفعها على المنصة.'
                : 'Teachers retain full, uncompromised intellectual property and copyright ownership over all courses, lessons, worksheets, media, and quiz banks they create.'}
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <strong className="text-ink">{isAr ? 'ترخيص تقني محدود للمنصة: ' : 'Limited Technical Hosting License: '}</strong>
              {isAr
                ? 'لا تدعي منصة امتياز أي حق ملكية على مواد المعلم، وتقتصر موافقة المعلم على منح المنصة ترخيصًا تقنيًا محدودًا لاستضافة وبث وعرض المحتوى لطلابه المسجلين بمجموعاته فقط.'
                : 'Emtiaz claims zero copyright over teacher materials. Teachers grant Emtiaz only the limited technical license needed to host and securely stream content to their enrolled students.'}
            </div>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <strong className="text-ink">{isAr ? 'حظر إعادة النشر غير المصرح: ' : 'Protection Against Redistribution: '}</strong>
              {isAr
                ? 'يُحظر تمامًا على أي طالب أو مستخدم نسخ أو تسجيل أو إعادة نشر أو بيع محتوى المعلم التعليمي دون موافقة كتابية صريحة منه.'
                : 'Students and third parties are strictly prohibited from copying, distributing, or monetizing teacher materials without explicit written consent.'}
            </div>
          </li>
        </ul>
      </Card>

      {/* Section 4: Teacher Subscriptions & Billing */}
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <CreditCard size={20} className="text-primary" />
          {isAr ? '4. باقات المعلمين، الفوترة، وسياسة الإلغاء' : '4. Teacher Subscriptions, Billing & Cancellation'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'توفر المنصة باقات واضحة للمعلمين لإدارة مجموعاتهم وسعة طلابهم:'
            : 'Emtiaz offers transparent plans tailored to teacher cohort sizes and storage needs:'}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="mb-1 text-sm font-bold text-ink">{isAr ? 'الباقة المجانية وفترة التجربة' : 'Free Tier & Trial Period'}</h3>
            <p className="text-xs leading-relaxed text-ink-soft">
              {isAr
                ? 'يحصل كل معلم على باقة مجانية، بالإضافة إلى إمكانية الاستفادة من فترات تجربة مجانية كاملة (مثل باقة الانطلاقة المبكرة لمدة 30 يومًا مجانًا) دون الحاجة لإدخال بطاقة دفع.'
                : 'Every teacher starts on a free plan, with access to 30-day full free trials on promotional tiers without requiring credit card registration.'}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-4">
            <h3 className="mb-1 text-sm font-bold text-ink">{isAr ? 'التسعير والإلغاء المرن' : 'Transparent Pricing & Cancellation'}</h3>
            <p className="text-xs leading-relaxed text-ink-soft">
              {isAr
                ? 'تُعرض الأسعار بشفافية بالريال العماني (OMR) والجنيه المصري (EGP). يمكن للمعلم إلغاء اشتراكه في أي وقت دون أي غرامات، ويستمر تفعيل الخطة حتى نهاية الفترة المدفوعة.'
                : 'Plans are priced transparently in OMR and EGP. Teachers may cancel anytime without fees, retaining access until the end of their billing term.'}
            </p>
          </div>
        </div>
      </Card>

      {/* Section 5: Acceptable Use & Prohibited Conduct */}
      <Card className="flex flex-col gap-4 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <ShieldAlert size={20} className="text-primary" />
          {isAr ? '5. الاستخدام المقبول والسلوكيات المحظورة' : '5. Acceptable Use & Prohibited Conduct'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'يُحظر تمامًا استخدام المنصة في أي من الأنشطة التالية:'
            : 'Users are strictly prohibited from engaging in any of the following actions:'}
        </p>
        <ul className="flex flex-col gap-2.5 text-sm text-ink-soft sm:text-base">
          <li>
            • <strong className="text-ink">{isAr ? 'المحتوى غير اللائق: ' : 'Unlawful Content: '}</strong>
            {isAr ? 'رفع أو تداول مواد تنتهك الآداب أو تحرض على العنف أو الكراهية أو تخالف القوانين السارية.' : 'Uploading materials that infringe on copyright, incite violence, or violate public decency.'}
          </li>
          <li>
            • <strong className="text-ink">{isAr ? 'المساس بأمن النظام: ' : 'Security Tampering: '}</strong>
            {isAr ? 'محاولة اختراق الخوادم أو مسح الثغرات أو تزوير درجات الطلاب أو محاولات الاختبار.' : 'Attempting unauthorized penetration tests, server scans, or gradebook tampering.'}
          </li>
          <li>
            • <strong className="text-ink">{isAr ? 'مشاركة الحسابات: ' : 'Account Sharing: '}</strong>
            {isAr ? 'مشاركة حساب المعلم الواحد بين عدة معلمين للتحايل على سعة الطلاب المقررة بالخطة.' : 'Sharing teacher login credentials among multiple educators to bypass student plan quotas.'}
          </li>
          <li>
            • <strong className="text-ink">{isAr ? 'الكشط الآلي (Scraping): ' : 'Automated Scraping: '}</strong>
            {isAr ? 'استخدام روبوتات أو برمجيات آلية لسحب محتوى المنصة أو بنوك الأسئلة أو بيانات المستخدمين.' : 'Utilizing automated bots, spiders, or scrapers to extract user or curriculum data.'}
          </li>
        </ul>
      </Card>

      {/* Section 6: Suspension & Termination */}
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
          <AlertTriangle size={20} className="text-primary" />
          {isAr ? '6. تعليق الحسابات وإغلاقها' : '6. Account Suspension & Termination'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'تحتفظ إدارة المنصة بالحق في تعليق أو إنهاء أي حساب يثبت ارتكابه لمخالفات جسيمة لهذه الشروط أو تهديده لأمن وسلامة الطلاب القُصّر دون إشعار مسبق. وفي حالات الإنهاء الاختياري من المعلم، يحق له تنزيل وتصدير سجل درجات طلابه كاملة قبل تنفيذ الحذف النهائي.'
            : 'Emtiaz reserves the right to suspend or terminate accounts guilty of egregious violations or actions jeopardizing student safety without notice. In normal account closures, teachers retain the right to export full gradebooks prior to account purging.'}
        </p>
      </Card>

      {/* Section 7: Limitation of Liability */}
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-lg font-bold text-ink">
          {isAr ? '7. إخلاء المسؤولية وحدودها' : '7. Limitation of Liability & Warranty'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'تبذل المنصة كافة العناية التقنية الممكنة لتوفير الخدمة بجاهزية عالية واستقرار مستمر (99.9%). ومع ذلك تُقدّم الخدمة "كما هي"، ولا تتحمل المنصة مسؤولية أي انقطاع خارج عن إرادتها ناتج عن مزودي خدمات الإنترنت والاتصالات، كما لا تتحمل المنصة المسؤولية عن التقديرات أو المحتوى الأكاديمي الذي يقدمه المعلم لطلابه.'
            : 'Emtiaz exerts diligent technical care to ensure robust service availability (99.9%). However, services are provided on an “as is” and “as available” basis without liability for third-party telecom outages, and Emtiaz is not liable for educator-authored evaluations or academic assessments.'}
        </p>
      </Card>

      {/* Section 8: Governing Law & Jurisdiction */}
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-lg font-bold text-ink">
          {isAr ? '8. القانون الحاكم وفض النزاعات' : '8. Governing Law & Jurisdiction'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'تخضع هذه الشروط وتُفسر وفقًا للقوانين والأنظمة السارية في سلطنة عُمان، وتختص المحاكم العمانية بالنظر في أي نزاع ينشأ عن تنفيذها أو تفسيرها.'
            : 'These Terms of Service are governed by and construed under the laws of the Sultanate of Oman. The competent courts of the Sultanate of Oman hold exclusive jurisdiction over any disputes.'}
        </p>
      </Card>

      {/* Section 9: Inquiries & Support */}
      <Card className="flex flex-col gap-3 p-6">
        <h2 className="text-lg font-bold text-ink">
          {isAr ? '9. التواصل والاستفسارات' : '9. Support & Legal Questions'}
        </h2>
        <p className="text-sm leading-relaxed text-ink-soft sm:text-base">
          {isAr
            ? 'لأي استفسارات حول شروط الاستخدام أو خدمات المنصة، يسعدنا تواصلكم المباشر عبر واتساب أو البريد الإلكتروني الرسمي لإدارة امتياز.'
            : 'For inquiries regarding these Terms of Service or platform operations, feel free to contact our administrative team directly via WhatsApp or official email.'}
        </p>
      </Card>
    </div>
  );
}

export const termsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/terms',
  component: Terms,
});
