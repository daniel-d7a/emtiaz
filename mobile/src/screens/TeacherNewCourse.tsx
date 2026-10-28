import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Choice, ErrorBox, Field, Text, c, s } from '../ui';
import type { Course, TaxonomyItem } from '../../../shared/api';

export default function TeacherNewCourse({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (courseId: string) => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [courseType, setCourseType] = useState<'ACADEMIC' | 'GENERAL'>('ACADEMIC');
  const [grade, setGrade] = useState('');
  const [semester, setSemester] = useState('');
  const [skill, setSkill] = useState('');
  const grades = useQuery({
    queryKey: ['grades-list'],
    queryFn: () => api<TaxonomyItem[]>('/api/admin/taxonomy/grades'),
  });
  const semesters = useQuery({
    queryKey: ['semesters-list'],
    queryFn: () => api<TaxonomyItem[]>('/api/admin/taxonomy/semesters'),
  });
  const categories = useQuery({
    queryKey: ['categories-list'],
    queryFn: () => api<TaxonomyItem[]>('/api/admin/taxonomy/categories'),
  });
  const create = useMutation({
    mutationFn: () => {
      const academic = courseType === 'ACADEMIC';
      const gradeItem = grades.data?.find(
        (item) => item.name.trim().toLowerCase() === grade.trim().toLowerCase(),
      );
      const categoryItem = categories.data?.find(
        (item) => item.name.trim().toLowerCase() === skill.trim().toLowerCase(),
      );
      return api<Course>('/api/teacher/courses', {
        body: {
          title: title.trim(),
          courseType,
          ...(academic
            ? {
                gradeId: gradeItem?.id,
                gradeName: gradeItem ? undefined : grade.trim(),
                semester: semester.trim() || undefined,
              }
            : {
                categoryId: categoryItem?.id,
                categoryName: categoryItem ? undefined : skill.trim(),
              }),
        },
      });
    },
    onSuccess: (course) => {
      void qc.invalidateQueries({ queryKey: ['teacher-courses'] });
      void qc.invalidateQueries({ queryKey: ['teacher-stats'] });
      onCreated(course.id);
    },
  });

  const academic = courseType === 'ACADEMIC';
  const valid = title.trim() && (academic ? grade.trim() : skill.trim());

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pageContent} keyboardShouldPersistTaps="handled">
      <Btn label="رجوع" onPress={onBack} variant="ghost" />
      <Text style={s.h1}>مقرر جديد</Text>
      <Card>
        <Field
          label="عنوان المقرر"
          value={title}
          onChange={setTitle}
          placeholder="مثال: الرياضيات للصف العاشر"
          maxLength={160}
        />
        <Choice
          label="نوع المقرر"
          value={courseType}
          onChange={setCourseType}
          options={[
            { value: 'ACADEMIC', label: 'دراسي' },
            { value: 'GENERAL', label: 'عام' },
          ]}
        />
        {academic ? (
          <>
            <Field label="الصف" value={grade} onChange={setGrade} placeholder="مثال: الصف العاشر" maxLength={80} />
            {grades.data && grades.data.length > 0 ? (
              <View style={{ marginTop: -4 }}>
                <Choice
                  value={grade}
                  onChange={setGrade}
                  options={grades.data.map((item) => ({ value: item.name, label: item.name }))}
                />
              </View>
            ) : null}
            <Field
              label="الفصل الدراسي (اختياري)"
              value={semester}
              onChange={setSemester}
              placeholder="مثال: الفصل الأول"
              maxLength={40}
            />
            {semesters.data && semesters.data.length > 0 ? (
              <View style={{ marginTop: -4 }}>
                <Choice
                  value={semester}
                  onChange={setSemester}
                  options={semesters.data.map((item) => ({ value: item.name, label: item.name }))}
                />
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Field
              label="المهارة"
              value={skill}
              onChange={setSkill}
              placeholder="مثال: البرمجة"
              maxLength={80}
            />
            {categories.data && categories.data.length > 0 ? (
              <View style={{ marginTop: -4 }}>
                <Choice
                  value={skill}
                  onChange={setSkill}
                  options={categories.data.map((item) => ({ value: item.name, label: item.name }))}
                />
              </View>
            ) : null}
          </>
        )}
        {create.error && <ErrorBox error={create.error} />}
        <Text style={{ color: c.inkSoft, fontSize: 12, marginBottom: 4 }}>
          {academic ? 'اسم الصف أو الفصل غير موجود في القائمة؟ اكتبه وسيُضاف تلقائيًا.' : 'اسم المهارة غير موجود؟ اكتبها وستُضاف تلقائيًا.'}
        </Text>
        <Btn
          label="حفظ المقرر"
          onPress={() => create.mutate()}
          loading={create.isPending}
          disabled={!valid}
        />
      </Card>
    </ScrollView>
  );
}
