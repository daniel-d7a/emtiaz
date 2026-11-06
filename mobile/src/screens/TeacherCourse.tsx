import { useEffect, useState } from 'react';
import { Image, ScrollView, Share, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, deleteUploadedObject, uploadFile } from '../api';
import { Btn, Card, Empty, ErrorBox, Field, Loading, Text, c, s } from '../ui';
import type { PresignedUpload, TeacherCourse } from '../../../shared/api';

export default function TeacherCourse({
  courseId,
  onBack,
  onOpenGroup,
  onOpenCurriculum,
}: {
  courseId: string;
  onBack: () => void;
  onOpenGroup: (groupId: string) => void;
  onOpenCurriculum: (courseId: string) => void;
}) {
  const qc = useQueryClient();
  const courses = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: () => api<TeacherCourse[]>('/api/teacher/courses'),
  });
  const course = courses.data?.find((item) => item.id === courseId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [groupName, setGroupName] = useState('');
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<Error | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!course) return;
    setTitle(course.title);
    setDescription(course.description ?? '');
    setPreviewUrl(course.previewUrl ?? '');
  }, [course]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['teacher-courses'] });
    void qc.invalidateQueries({ queryKey: ['teacher-stats'] });
  };

  const save = useMutation({
    mutationFn: (image?: string) =>
      api(`/api/teacher/courses/${courseId}`, {
        method: 'PATCH',
        body: {
          title: title.trim(),
          description: description.trim(),
          previewUrl: previewUrl.trim() || null,
          ...(image ? { image } : {}),
        },
      }),
    onSuccess: () => {
      setSaved(true);
      invalidate();
    },
  });

  const publish = useMutation({
    mutationFn: () =>
      api(`/api/teacher/courses/${courseId}`, {
        method: 'PATCH',
        body: { isPublished: !course?.isPublished },
      }),
    onSuccess: invalidate,
  });

  const addGroup = useMutation({
    mutationFn: () =>
      api(`/api/teacher/courses/${courseId}/groups`, {
        body: { name: groupName.trim() },
      }),
    onSuccess: () => {
      setGroupName('');
      setShowGroupForm(false);
      invalidate();
    },
  });

  const pickImage = async () => {
    setUploadError(null);
    setSaved(false);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      const size = asset.fileSize ?? new File(asset.uri).size;
      if (!size) throw new Error('تعذر قراءة حجم الصورة.');
      if (size > 5 * 1024 * 1024) throw new Error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت.');
      setUploadBusy(true);
      const mime = asset.mimeType ?? 'image/jpeg';
      const up = await api<PresignedUpload>('/api/storage/course-image', {
        body: {
          courseId,
          fileName: asset.fileName ?? 'course.jpg',
          mimeType: mime,
          fileSizeBytes: size,
        },
      });
      await uploadFile(up.uploadUrl, asset.uri, mime);
      try {
        await save.mutateAsync(up.objectKey);
      } catch (error) {
        await deleteUploadedObject(up.objectKey);
        throw error;
      }
    } catch (error) {
      setUploadError(error as Error);
    } finally {
      setUploadBusy(false);
    }
  };

  const shareGroup = (joinCode: string, name: string) => {
    void Share.share({
      message: `${name}\nرمز الانضمام: ${joinCode}`,
    });
  };

  if (courses.error) {
    return (
      <View style={s.page}>
        <ErrorBox error={courses.error} />
        <Btn label="رجوع" onPress={onBack} variant="ghost" />
      </View>
    );
  }
  if (!courses.data || (courses.isFetching && !course)) return <Loading />;
  if (!course) {
    return (
      <View style={s.page}>
        <Empty text="المقرر غير موجود" />
        <Btn label="رجوع" onPress={onBack} variant="ghost" />
      </View>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pageContent} keyboardShouldPersistTaps="handled">
      <Btn label="رجوع" onPress={onBack} variant="ghost" />
      <View style={[s.row, { alignItems: 'flex-start' }]}>
        <Text style={[s.h1, { flexShrink: 1, marginBottom: 4 }]}>{course.title}</Text>
        <Text style={s.badge}>
          {course.courseType === 'ACADEMIC' ? 'دراسي' : 'عام'} ·{' '}
          {course.isPublished ? 'منشور' : 'موقوف'}
        </Text>
      </View>
      <Text style={{ color: c.inkSoft, marginBottom: 12 }}>
        {course.analytics.groups} مجموعة · {course.analytics.students} طالب ·{' '}
        {course.analytics.lessons} درس · تقدم {course.analytics.avgProgress}%
      </Text>

      <View style={[s.row, { marginBottom: 12 }]}>
        <Btn label="المنهج" onPress={() => onOpenCurriculum(course.id)} />
        <Btn
          label={course.isPublished ? 'إيقاف النشر' : 'نشر المقرر'}
          variant="ghost"
          onPress={() => publish.mutate()}
          loading={publish.isPending}
        />
      </View>

      <Card>
        <Text style={s.h2}>بيانات المقرر</Text>
        {course.imageUrl ? (
          <Image
            source={{ uri: course.imageUrl }}
            style={{ width: '100%', height: 150, borderRadius: 12, marginBottom: 10 }}
          />
        ) : null}
        <Btn
          label={course.imageUrl ? 'تغيير صورة المقرر' : 'إضافة صورة للمقرر'}
          variant="ghost"
          onPress={pickImage}
          loading={uploadBusy}
        />
        <Text style={{ color: c.inkSoft, fontSize: 12, marginBottom: 8 }}>PNG/JPG · حتى 5 ميجابايت</Text>
        <Field
          label="عنوان المقرر"
          value={title}
          onChange={(value) => {
            setTitle(value);
            setSaved(false);
          }}
          maxLength={160}
        />
        <Field
          label="وصف المقرر"
          value={description}
          onChange={(value) => {
            setDescription(value);
            setSaved(false);
          }}
          multiline
          maxLength={2000}
        />
        <Field
          label="رابط المعاينة (اختياري)"
          value={previewUrl}
          onChange={(value) => {
            setPreviewUrl(value);
            setSaved(false);
          }}
          dir="ltr"
          placeholder="https://"
          maxLength={500}
        />
        {saved && <Text style={{ color: c.primary, marginBottom: 8 }}>تم الحفظ</Text>}
        {uploadError && <ErrorBox error={uploadError} />}
        {save.error && <ErrorBox error={save.error} />}
        <Btn
          label="حفظ التعديلات"
          onPress={() => save.mutate(undefined)}
          loading={save.isPending}
          disabled={!title.trim() || uploadBusy}
        />
      </Card>

      <View style={[s.row, { marginBottom: 8 }]}>
        <Text style={s.h2}>المجموعات</Text>
        <Btn
          label={showGroupForm ? 'إلغاء' : 'مجموعة جديدة'}
          variant="ghost"
          onPress={() => setShowGroupForm((value) => !value)}
        />
      </View>
      {showGroupForm && (
        <Card>
          <Field label="اسم المجموعة" value={groupName} onChange={setGroupName} />
          <Btn
            label="إضافة"
            onPress={() => addGroup.mutate()}
            loading={addGroup.isPending}
            disabled={!groupName.trim()}
          />
          {addGroup.error && <ErrorBox error={addGroup.error} />}
        </Card>
      )}
      {course.groups.length === 0 && <Empty text="لا توجد مجموعات بعد" />}
      {course.groups.map((group) => (
        <Card key={group.id}>
          <View style={[s.row, { alignItems: 'flex-start' }]}>
            <Text style={[s.h2, { flexShrink: 1, marginBottom: 0 }]}>{group.name || 'بدون اسم'}</Text>
            <Text style={s.badge}>{group.isActive ? 'نشطة' : 'موقوفة'}</Text>
          </View>
          <Text style={{ color: c.inkSoft, fontSize: 13, marginTop: 4 }}>
            {group.joinCode} · {group.studentCount} طالب · تقدم {group.progress}%
          </Text>
          <Text style={{ color: c.inkSoft, fontSize: 13, marginTop: 2 }}>
            {group.days || 'بدون أيام'} · {group.time || 'بدون وقت'}
          </Text>
          <View style={[s.row, { marginTop: 8 }]}>
            <Btn label="فتح المجموعة" onPress={() => onOpenGroup(group.id)} />
            <Btn
              label="مشاركة الرمز"
              variant="ghost"
              onPress={() => shareGroup(group.joinCode, group.name || course.title)}
            />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}
