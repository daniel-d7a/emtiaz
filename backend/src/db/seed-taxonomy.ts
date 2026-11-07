import { eq } from 'drizzle-orm';
import { categories, grades, type Country } from './schema';

export interface SeedGrade {
  country: Country;
  nameAr: string;
  nameEn: string;
  displayOrder: number;
}

export interface SeedCategory {
  nameAr: string;
  nameEn: string;
}

export const SEED_OMAN_GRADES: SeedGrade[] = [
  { country: 'OM', nameAr: 'الصف الأول', nameEn: 'Grade 1', displayOrder: 1 },
  { country: 'OM', nameAr: 'الصف الثاني', nameEn: 'Grade 2', displayOrder: 2 },
  { country: 'OM', nameAr: 'الصف الثالث', nameEn: 'Grade 3', displayOrder: 3 },
  { country: 'OM', nameAr: 'الصف الرابع', nameEn: 'Grade 4', displayOrder: 4 },
  { country: 'OM', nameAr: 'الصف الخامس', nameEn: 'Grade 5', displayOrder: 5 },
  { country: 'OM', nameAr: 'الصف السادس', nameEn: 'Grade 6', displayOrder: 6 },
  { country: 'OM', nameAr: 'الصف السابع', nameEn: 'Grade 7', displayOrder: 7 },
  { country: 'OM', nameAr: 'الصف الثامن', nameEn: 'Grade 8', displayOrder: 8 },
  { country: 'OM', nameAr: 'الصف التاسع', nameEn: 'Grade 9', displayOrder: 9 },
  { country: 'OM', nameAr: 'الصف العاشر', nameEn: 'Grade 10', displayOrder: 10 },
  { country: 'OM', nameAr: 'الصف الحادي عشر', nameEn: 'Grade 11', displayOrder: 11 },
  { country: 'OM', nameAr: 'الصف الثاني عشر', nameEn: 'Grade 12', displayOrder: 12 },
];

export const SEED_EGYPT_GRADES: SeedGrade[] = [
  { country: 'EG', nameAr: 'الصف الأول الابتدائي', nameEn: '1st Grade Primary Education', displayOrder: 1 },
  { country: 'EG', nameAr: 'الصف الثاني الابتدائي', nameEn: '2nd Grade Primary Education', displayOrder: 2 },
  { country: 'EG', nameAr: 'الصف الثالث الابتدائي', nameEn: '3rd Grade Primary Education', displayOrder: 3 },
  { country: 'EG', nameAr: 'الصف الرابع الابتدائي', nameEn: '4th Grade Primary Education', displayOrder: 4 },
  { country: 'EG', nameAr: 'الصف الخامس الابتدائي', nameEn: '5th Grade Primary Education', displayOrder: 5 },
  { country: 'EG', nameAr: 'الصف السادس الابتدائي', nameEn: '6th Grade Primary Education', displayOrder: 6 },
  { country: 'EG', nameAr: 'الصف الأول الإعدادي', nameEn: '1st Grade Preparatory Education', displayOrder: 7 },
  { country: 'EG', nameAr: 'الصف الثاني الإعدادي', nameEn: '2nd Grade Preparatory Education', displayOrder: 8 },
  { country: 'EG', nameAr: 'الصف الثالث الإعدادي', nameEn: '3rd Grade Preparatory Education', displayOrder: 9 },
  { country: 'EG', nameAr: 'الصف الأول الثانوي', nameEn: '1st Grade Secondary Education', displayOrder: 10 },
  { country: 'EG', nameAr: 'الصف الثاني الثانوي', nameEn: '2nd Grade Secondary Education', displayOrder: 11 },
  { country: 'EG', nameAr: 'الصف الثالث الثانوي', nameEn: '3rd Grade Secondary Education', displayOrder: 12 },
];

export const SEED_GRADES: SeedGrade[] = [...SEED_OMAN_GRADES, ...SEED_EGYPT_GRADES];

export const SEED_CATEGORIES: SeedCategory[] = [
  { nameEn: 'English Language', nameAr: 'اللغة الإنجليزية' },
  { nameEn: 'English Speaking', nameAr: 'المحادثة بالإنجليزية' },
  { nameEn: 'IELTS & TOEFL Preparation', nameAr: 'التحضير لاختبارات آيلتس وتوفل' },
  { nameEn: 'German', nameAr: 'اللغة الألمانية' },
  { nameEn: 'French', nameAr: 'اللغة الفرنسية' },
  { nameEn: 'Arabic for Non-Native Speakers', nameAr: 'العربية لغير الناطقين بها' },
  { nameEn: 'Spanish', nameAr: 'اللغة الإسبانية' },
  { nameEn: 'Turkish', nameAr: 'اللغة التركية' },
  { nameEn: 'Programming & Computer Science', nameAr: 'البرمجة وعلوم الحاسب' },
  { nameEn: 'Web & App Development', nameAr: 'تطوير المواقع والتطبيقات' },
  { nameEn: 'AI & Data Science', nameAr: 'الذكاء الاصطناعي وعلوم البيانات' },
  { nameEn: 'Cybersecurity & Networking', nameAr: 'الأمن السيبراني والشبكات' },
  { nameEn: 'Graphic Design', nameAr: 'التصميم الجرافيكي' },
  { nameEn: 'UI/UX Design', nameAr: 'تصميم واجهات وتجربة المستخدم (UI/UX)' },
  { nameEn: 'Video Editing & Motion Graphics', nameAr: 'مونتاج الفيديو والموشن جرافيك' },
  { nameEn: 'Digital Marketing & Content Creation', nameAr: 'التسويق الرقمي وصناعة المحتوى' },
  { nameEn: 'Business & Entrepreneurship', nameAr: 'إدارة الأعمال وريادة الأعمال' },
  { nameEn: 'Accounting & Finance', nameAr: 'المحاسبة والمالية' },
  { nameEn: 'Excel & Office Productivity', nameAr: 'إكسل وبرامج الأوفيس الإنتاجية' },
  { nameEn: 'Project Management', nameAr: 'إدارة المشاريع' },
  { nameEn: 'Quran & Tajweed', nameAr: 'القرآن الكريم والتجويد' },
  { nameEn: 'Islamic Studies', nameAr: 'الدراسات الإسلامية' },
  { nameEn: 'Mathematics & Mental Math', nameAr: 'الرياضيات والحساب الذهني' },
  { nameEn: 'Robotics & Electronics', nameAr: 'الروبوتات والإلكترونيات' },
  { nameEn: 'Public Speaking & Communication', nameAr: 'الخطابة ومهارات التواصل' },
  { nameEn: 'Drawing & Fine Arts', nameAr: 'الرسم والفنون الجميلة' },
  { nameEn: 'Photography', nameAr: 'التصوير الفوتوغرافي' },
  { nameEn: 'Chess & Strategic Thinking', nameAr: 'الشطرنج والتفكير الاستراتيجي' },
  { nameEn: 'Standardized Test Preparation', nameAr: 'التحضير للاختبارات المعيارية والقدرات' },
  { nameEn: 'Soft Skills & Personal Development', nameAr: 'المهارات الشخصية وتطوير الذات' },
];

export async function seedTaxonomy(database: any) {
  const existingGrades: Array<typeof grades.$inferSelect> = await database.select().from(grades);
  const gradesToInsert: Array<typeof grades.$inferInsert> = [];

  for (const grade of SEED_GRADES) {
    const match = existingGrades.find(
      (g) =>
        g.country === grade.country &&
        (g.name.toLowerCase() === grade.nameEn.toLowerCase() ||
          g.nameEn.toLowerCase() === grade.nameEn.toLowerCase() ||
          g.nameAr === grade.nameAr),
    );
    if (match) {
      if (
        match.name !== grade.nameEn ||
        match.nameAr !== grade.nameAr ||
        match.nameEn !== grade.nameEn ||
        match.displayOrder !== grade.displayOrder
      ) {
        await database
          .update(grades)
          .set({
            country: grade.country,
            name: grade.nameEn,
            nameAr: grade.nameAr,
            nameEn: grade.nameEn,
            displayOrder: grade.displayOrder,
          })
          .where(eq(grades.id, match.id));
      }
    } else {
      gradesToInsert.push({
        country: grade.country,
        name: grade.nameEn,
        nameAr: grade.nameAr,
        nameEn: grade.nameEn,
        displayOrder: grade.displayOrder,
      });
    }
  }

  if (gradesToInsert.length > 0) {
    await database.insert(grades).values(gradesToInsert);
  }

  const existingCategories: Array<typeof categories.$inferSelect> = await database
    .select()
    .from(categories);
  const categoriesToInsert: Array<typeof categories.$inferInsert> = [];

  for (const cat of SEED_CATEGORIES) {
    const match = existingCategories.find(
      (c) =>
        c.name.toLowerCase() === cat.nameEn.toLowerCase() ||
        c.nameEn.toLowerCase() === cat.nameEn.toLowerCase() ||
        c.nameAr === cat.nameAr,
    );
    if (match) {
      if (match.name !== cat.nameEn || match.nameAr !== cat.nameAr || match.nameEn !== cat.nameEn) {
        await database
          .update(categories)
          .set({
            name: cat.nameEn,
            nameAr: cat.nameAr,
            nameEn: cat.nameEn,
          })
          .where(eq(categories.id, match.id));
      }
    } else {
      categoriesToInsert.push({
        name: cat.nameEn,
        nameAr: cat.nameAr,
        nameEn: cat.nameEn,
      });
    }
  }

  if (categoriesToInsert.length > 0) {
    await database.insert(categories).values(categoriesToInsert);
  }
}
