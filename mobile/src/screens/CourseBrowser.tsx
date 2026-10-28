import { useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Choice, Empty, ErrorBox, Field, Loading, Text, c, s } from '../ui';
import type { CourseCatalogue } from '../../../shared/api';

const emptyFilters = {
  teacherId: '',
  subjectId: '',
  gradeId: '',
  courseType: '',
  semester: '',
};

export default function CourseBrowser({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(emptyFilters);

  const setFilter = (key: keyof typeof emptyFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  if (filters.teacherId) params.set('teacherId', filters.teacherId);
  if (filters.subjectId) params.set('subjectId', filters.subjectId);
  if (filters.gradeId) params.set('gradeId', filters.gradeId);
  if (filters.courseType) params.set('courseType', filters.courseType);
  if (filters.semester) params.set('semester', filters.semester);
  const query = params.toString();

  const courses = useQuery({
    queryKey: ['course-catalogue', query],
    queryFn: () => api<CourseCatalogue>(`/api/public/courses${query ? `?${query}` : ''}`),
    placeholderData: (prev) => prev,
  });

  const data = courses.data;
  const hasFilters = !!(search.trim() || filters.teacherId || filters.subjectId || filters.gradeId || filters.courseType || filters.semester);
  const clear = () => {
    setSearch('');
    setFilters(emptyFilters);
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pageContent} keyboardShouldPersistTaps="handled">
      <Btn label="رجوع" variant="ghost" onPress={onBack} />
      <Text style={s.h1}>تصفح المقررات</Text>
      <Card>
        <Field label="بحث" value={search} onChange={setSearch} placeholder="ابحث عن مقرر…" />
        <Choice
          label="المعلم"
          value={filters.teacherId}
          onChange={(v) => setFilter('teacherId', v)}
          options={[
            { value: '', label: 'الكل' },
            ...(data?.filters.teachers ?? []).map((x) => ({ value: x.id, label: x.name })),
          ]}
        />
        <Choice
          label="التخصص"
          value={filters.subjectId}
          onChange={(v) => setFilter('subjectId', v)}
          options={[
            { value: '', label: 'الكل' },
            ...(data?.filters.subjects ?? []).map((x) => ({ value: x.id, label: x.name })),
          ]}
        />
        <Choice
          label="الصف"
          value={filters.gradeId}
          onChange={(v) => setFilter('gradeId', v)}
          options={[
            { value: '', label: 'الكل' },
            ...(data?.filters.grades ?? []).map((x) => ({ value: x.id, label: x.name })),
          ]}
        />
        <Choice
          label="النوع"
          value={filters.courseType}
          onChange={(v) => setFilter('courseType', v)}
          options={[
            { value: '', label: 'الكل' },
            { value: 'ACADEMIC', label: 'دراسي' },
            { value: 'GENERAL', label: 'عام' },
          ]}
        />
        <Choice
          label="الفصل"
          value={filters.semester}
          onChange={(v) => setFilter('semester', v)}
          options={[
            { value: '', label: 'الكل' },
            ...(data?.filters.semesters ?? []).map((x) => ({ value: x, label: x })),
          ]}
        />
        {hasFilters && <Btn label="مسح الفلاتر" variant="ghost" onPress={clear} />}
      </Card>

      {courses.isLoading ? (
        <Loading />
      ) : courses.error ? (
        <ErrorBox error={courses.error} />
      ) : data?.courses.length ? (
        data.courses.map((course) => (
          <Card key={course.id}>
            {course.imageUrl ? (
              <Image
                source={{ uri: course.imageUrl }}
                style={{ width: '100%', height: 140, borderRadius: 12, marginBottom: 10 }}
              />
            ) : null}
            <View style={s.row}>
              <Text style={[s.h2, { flexShrink: 1, marginBottom: 0 }]}>{course.title}</Text>
              <Text style={s.badge}>{course.courseType === 'ACADEMIC' ? 'دراسي' : 'عام'}</Text>
            </View>
            <Text style={{ color: c.primary, fontWeight: '600', marginTop: 4 }}>{course.teacher.name}</Text>
            <Text style={{ color: c.inkSoft, fontSize: 12, marginTop: 2 }}>
              {[course.subject, course.grade].filter(Boolean).join(' · ') || '—'}
              {course.semester ? ` · ${course.semester}` : ''}
            </Text>
            {course.description ? (
              <Text style={{ color: c.inkSoft, fontSize: 13, marginTop: 6 }}>{course.description}</Text>
            ) : null}
          </Card>
        ))
      ) : (
        <Empty text="لا توجد مقررات مطابقة" />
      )}
    </ScrollView>
  );
}
