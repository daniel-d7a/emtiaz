import { useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, uploadFile } from '../api';
import {
  Btn,
  Card,
  Choice,
  Empty,
  ErrorBox,
  Field,
  Loading,
  MiniBtn,
  Text,
  c,
  s,
} from '../ui';
import type {
  Attachment,
  PresignedUpload,
  TeacherCurriculum as Curriculum,
  TeacherCurriculumLesson,
  TeacherCurriculumModule,
  TeacherQuiz,
} from '../../../shared/api';

type QuizFormQuestion = {
  id: string;
  questionType: 'MCQ' | 'TRUE_FALSE';
  prompt: string;
  imageKey: string | null;
  imageUrl: string | null;
  options: string[];
  correctIndex: number | null;
  correctBool: 'true' | 'false' | '';
};

function swap<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function blankQuestion(): QuizFormQuestion {
  return {
    id: `${Date.now()}-${Math.random()}`,
    questionType: 'MCQ',
    prompt: '',
    imageKey: null,
    imageUrl: null,
    options: ['', ''],
    correctIndex: null,
    correctBool: '',
  };
}

function formQuestion(question: TeacherQuiz['questions'][number]): QuizFormQuestion {
  return {
    id: question.id,
    questionType: question.questionType,
    prompt: question.prompt,
    imageKey: question.imageKey,
    imageUrl: question.imageUrl,
    options: question.options?.length ? question.options : ['', ''],
    correctIndex:
      question.questionType === 'MCQ' && question.options
        ? question.options.findIndex((option) => option === question.correctAnswer)
        : null,
    correctBool:
      question.questionType === 'TRUE_FALSE'
        ? question.correctAnswer.toLowerCase() === 'false'
          ? 'false'
          : 'true'
        : '',
  };
}

function quizCount(data: Curriculum): number {
  return [
    data.quiz,
    ...data.modules.flatMap((mod) => [
      mod.quiz,
      ...mod.lessons.map((lesson) => lesson.quiz),
    ]),
  ].filter(Boolean).length;
}

export default function TeacherCurriculum({
  courseId,
  onBack,
}: {
  courseId: string;
  onBack: () => void;
}) {
  const qc = useQueryClient();
  const [moduleName, setModuleName] = useState('');
  const curriculum = useQuery({
    queryKey: ['teacher-curriculum', courseId],
    queryFn: () => api<Curriculum>(`/api/teacher/courses/${courseId}/curriculum`),
  });
  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ['teacher-curriculum', courseId] });
  const addModule = useMutation({
    mutationFn: () =>
      api(`/api/teacher/courses/${courseId}/modules`, {
        body: { title: moduleName.trim() },
      }),
    onSuccess: () => {
      setModuleName('');
      invalidate();
    },
  });
  const reorderModules = useMutation({
    mutationFn: (moduleIds: string[]) =>
      api(`/api/teacher/courses/${courseId}/modules/reorder`, {
        method: 'PUT',
        body: { moduleIds },
      }),
    onSuccess: invalidate,
  });

  if (curriculum.error) {
    return (
      <View style={s.page}>
        <ErrorBox error={curriculum.error} />
        <Btn label="رجوع" onPress={onBack} variant="ghost" />
      </View>
    );
  }
  if (!curriculum.data) return <Loading />;
  const data = curriculum.data;
  const lessonTotal = data.modules.reduce((total, mod) => total + mod.lessons.length, 0);

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pageContent} keyboardShouldPersistTaps="handled">
      <Btn label="رجوع" onPress={onBack} variant="ghost" />
      <Text style={s.h1}>المنهج</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        {[
          { label: 'الوحدات', value: data.modules.length },
          { label: 'الدروس', value: lessonTotal },
          { label: 'الاختبارات', value: quizCount(data) },
        ].map((item) => (
          <View key={item.label} style={[s.card, { flex: 1, marginBottom: 0, padding: 12 }]}>
            <Text style={{ color: c.inkSoft, fontSize: 12 }}>{item.label}</Text>
            <Text style={{ fontSize: 22, fontWeight: '700', color: c.primaryDark }}>{item.value}</Text>
          </View>
        ))}
      </View>

      <Card>
        <View style={[s.row, { alignItems: 'flex-start' }]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={s.h2}>الاختبار النهائي</Text>
            <Text style={{ color: c.inkSoft, fontSize: 13 }}>
              {data.quiz?.title ?? 'لا يوجد اختبار نهائي'}
            </Text>
          </View>
          <QuizBuilder
            courseId={courseId}
            endpoint={`/api/teacher/courses/${courseId}/quiz`}
            existing={data.quiz}
            label={data.quiz ? 'تعديل' : 'إضافة'}
          />
        </View>
      </Card>

      {data.modules.length === 0 && <Empty text="لا توجد وحدات بعد" />}
      {data.modules.map((mod, index) => (
        <ModuleCard
          key={`${mod.id}-${mod.title}`}
          mod={mod}
          courseId={courseId}
          canUp={index > 0}
          canDown={index < data.modules.length - 1}
          moving={reorderModules.isPending}
          onMoveModule={(direction) =>
            reorderModules.mutate(
              swap(data.modules.map((item) => item.id), index, direction),
            )
          }
        />
      ))}

      <Card>
        <Text style={s.h2}>وحدة جديدة</Text>
        <Field label="اسم الوحدة" value={moduleName} onChange={setModuleName} maxLength={160} />
        {addModule.error && <ErrorBox error={addModule.error} />}
        <Btn
          label="إضافة الوحدة"
          onPress={() => addModule.mutate()}
          loading={addModule.isPending}
          disabled={!moduleName.trim()}
        />
      </Card>
    </ScrollView>
  );
}

function ModuleCard({
  mod,
  courseId,
  canUp,
  canDown,
  moving,
  onMoveModule,
}: {
  mod: TeacherCurriculumModule;
  courseId: string;
  canUp: boolean;
  canDown: boolean;
  moving: boolean;
  onMoveModule: (direction: -1 | 1) => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(mod.title);
  const [lessonTitle, setLessonTitle] = useState('');
  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ['teacher-curriculum', courseId] });
  const rename = useMutation({
    mutationFn: () =>
      api(`/api/teacher/modules/${mod.id}`, {
        method: 'PATCH',
        body: { title: title.trim() },
      }),
    onSuccess: () => {
      setEditing(false);
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: () => api(`/api/teacher/modules/${mod.id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
  const addLesson = useMutation({
    mutationFn: () =>
      api(`/api/teacher/modules/${mod.id}/lessons`, {
        body: { title: lessonTitle.trim() },
      }),
    onSuccess: () => {
      setLessonTitle('');
      invalidate();
    },
  });
  const reorder = useMutation({
    mutationFn: (items: Array<{ id: string; type: 'lesson' | 'quiz' }>) =>
      api(`/api/teacher/modules/${mod.id}/items/reorder`, {
        method: 'PUT',
        body: { items },
      }),
    onSuccess: invalidate,
  });
  const items = [
    ...mod.lessons.map((lesson) => ({
      id: lesson.id,
      type: 'lesson' as const,
      order: lesson.displayOrder,
      lesson,
    })),
    ...(mod.quiz
      ? [{ id: mod.quiz.id, type: 'quiz' as const, order: mod.quiz.displayOrder, quiz: mod.quiz }]
      : []),
  ].sort((a, b) => a.order - b.order);
  const error = rename.error ?? remove.error ?? addLesson.error ?? reorder.error;

  const confirmDelete = () =>
    Alert.alert('حذف الوحدة', `هل تريد حذف "${mod.title}" وكل دروسها؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  return (
    <Card>
      <View style={[s.row, { alignItems: 'flex-start' }]}>
        <View style={{ flexShrink: 1 }}>
          <Text style={s.h2}>{mod.title}</Text>
          <Text style={{ color: c.inkSoft, fontSize: 12 }}>
            {mod.lessons.length} درس · {[mod.quiz, ...mod.lessons.map((lesson) => lesson.quiz)].filter(Boolean).length} اختبار
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <MiniBtn label="↑" accessibilityLabel="تحريك لأعلى" disabled={!canUp || moving} onPress={() => onMoveModule(-1)} />
          <MiniBtn label="↓" accessibilityLabel="تحريك لأسفل" disabled={!canDown || moving} onPress={() => onMoveModule(1)} />
          <MiniBtn label="تعديل" onPress={() => setEditing((value) => !value)} />
          <MiniBtn label="حذف" tone="danger" onPress={confirmDelete} />
        </View>
      </View>

      {editing ? (
        <View style={{ marginTop: 8 }}>
          <Field label="اسم الوحدة" value={title} onChange={setTitle} maxLength={160} />
          <View style={[s.row, { marginBottom: 8 }]}>
            <Btn label="حفظ" onPress={() => rename.mutate()} loading={rename.isPending} disabled={!title.trim()} />
            <Btn
              label="إلغاء"
              variant="ghost"
              onPress={() => {
                setEditing(false);
                setTitle(mod.title);
              }}
            />
          </View>
        </View>
      ) : null}

      <Btn label={open ? 'إخفاء الدروس' : 'عرض الدروس'} variant="ghost" onPress={() => setOpen((value) => !value)} />
      {open ? (
        <View style={{ marginTop: 8 }}>
          <View style={[s.row, { marginBottom: 8 }]}>
            <Text style={{ fontWeight: '600' }}>اختبار الوحدة</Text>
            <QuizBuilder
              courseId={courseId}
              endpoint={`/api/teacher/modules/${mod.id}/quiz`}
              existing={mod.quiz}
              label={mod.quiz ? 'تعديل' : 'إضافة'}
            />
          </View>
          {items.length === 0 && <Text style={{ color: c.inkSoft, marginBottom: 8 }}>لا توجد دروس بعد</Text>}
          {items.map((item, index) => {
            const move = (direction: -1 | 1) =>
              reorder.mutate(
                swap(items, index, direction).map(({ id, type }) => ({ id, type })),
              );
            if (item.type === 'quiz') {
              return (
                <View
                  key={item.id}
                  style={[s.row, { borderWidth: 1, borderColor: c.primaryLight, borderRadius: 12, padding: 8, marginBottom: 8 }]}
                >
                  <View style={{ flexShrink: 1 }}>
                    <Text style={{ fontWeight: '600' }}>{item.quiz.title}</Text>
                    <Text style={{ color: c.inkSoft, fontSize: 12 }}>اختبار الوحدة</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <MiniBtn label="↑" accessibilityLabel="تحريك لأعلى" disabled={index === 0 || reorder.isPending} onPress={() => move(-1)} />
                    <MiniBtn label="↓" accessibilityLabel="تحريك لأسفل" disabled={index === items.length - 1 || reorder.isPending} onPress={() => move(1)} />
                  </View>
                </View>
              );
            }
            return (
              <LessonEditor
                key={item.id}
                lesson={item.lesson}
                courseId={courseId}
                canUp={index > 0}
                canDown={index < items.length - 1}
                moving={reorder.isPending}
                onMove={move}
              />
            );
          })}
          <Field label="درس جديد" value={lessonTitle} onChange={setLessonTitle} maxLength={160} />
          <Btn
            label="إضافة درس"
            onPress={() => addLesson.mutate()}
            loading={addLesson.isPending}
            disabled={!lessonTitle.trim()}
          />
        </View>
      ) : null}
      {error && <ErrorBox error={error} />}
    </Card>
  );
}

function LessonEditor({
  lesson,
  courseId,
  canUp,
  canDown,
  moving,
  onMove,
}: {
  lesson: TeacherCurriculumLesson;
  courseId: string;
  canUp: boolean;
  canDown: boolean;
  moving: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [content, setContent] = useState(lesson.content ?? '');
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<Error | null>(null);
  const [openError, setOpenError] = useState<Error | null>(null);
  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ['teacher-curriculum', courseId] });
  const save = useMutation({
    mutationFn: () =>
      api(`/api/teacher/lessons/${lesson.id}`, {
        method: 'PATCH',
        body: { title: title.trim(), content },
      }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: () => api(`/api/teacher/lessons/${lesson.id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
  const addLink = useMutation({
    mutationFn: () =>
      api('/api/storage/attachments', {
        body: {
          lessonId: lesson.id,
          title: materialTitle.trim() || materialUrl.trim(),
          url: materialUrl.trim(),
        },
      }),
    onSuccess: () => {
      setMaterialTitle('');
      setMaterialUrl('');
      invalidate();
    },
  });
  const removeAttachment = useMutation({
    mutationFn: (attachmentId: string) =>
      api(`/api/storage/attachments/${attachmentId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });

  const uploadMaterial = async () => {
    setUploadError(null);
    try {
      const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      const size = asset.size ?? new File(asset.uri).size ?? 0;
      if (!size) throw new Error('تعذر قراءة حجم الملف.');
      if (size > 100 * 1024 * 1024) throw new Error('حجم الملف يجب ألا يتجاوز 100 ميجابايت.');
      setUploadBusy(true);
      const mime = asset.mimeType ?? 'application/octet-stream';
      const up = await api<PresignedUpload>('/api/storage/presigned-upload', {
        body: {
          courseId,
          lessonId: lesson.id,
          fileName: asset.name,
          mimeType: mime,
          fileSizeBytes: size,
        },
      });
      await uploadFile(up.uploadUrl, asset.uri, mime);
      await api('/api/storage/attachments', {
        body: {
          lessonId: lesson.id,
          title: materialTitle.trim() || asset.name,
          objectKey: up.objectKey,
          mimeType: mime,
          fileSizeBytes: size,
        },
      });
      setMaterialTitle('');
      invalidate();
    } catch (error) {
      setUploadError(error as Error);
    } finally {
      setUploadBusy(false);
    }
  };

  const openAttachment = async (attachment: Attachment) => {
    setOpenError(null);
    try {
      const url =
        attachment.url ??
        (await api<{ url: string }>(`/api/storage/attachments/${attachment.id}/download`)).url;
      await Linking.openURL(url);
    } catch (error) {
      setOpenError(error as Error);
    }
  };

  const confirmDelete = () =>
    Alert.alert('حذف الدرس', `هل تريد حذف "${lesson.title}"؟`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => remove.mutate() },
    ]);

  const error =
    save.error ??
    remove.error ??
    addLink.error ??
    removeAttachment.error ??
    uploadError ??
    openError;

  return (
    <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 12, padding: 8, marginBottom: 8 }}>
      <View style={[s.row, { alignItems: 'flex-start' }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((value) => !value)}
          style={{ flexShrink: 1, minHeight: 40, justifyContent: 'center' }}
        >
          <Text style={{ fontWeight: '600' }}>{lesson.title}</Text>
          <Text style={{ color: c.inkSoft, fontSize: 12 }}>
            {lesson.attachments.length} مادة · {lesson.quiz ? 'يوجد اختبار' : 'بدون اختبار'}
          </Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <MiniBtn label="↑" accessibilityLabel="تحريك لأعلى" disabled={!canUp || moving} onPress={() => onMove(-1)} />
          <MiniBtn label="↓" accessibilityLabel="تحريك لأسفل" disabled={!canDown || moving} onPress={() => onMove(1)} />
          <MiniBtn label="حذف" tone="danger" onPress={confirmDelete} />
        </View>
      </View>

      {open ? (
        <View style={{ marginTop: 8 }}>
          <Field label="عنوان الدرس" value={title} onChange={setTitle} maxLength={160} />
          <Field label="محتوى الدرس" value={content} onChange={setContent} multiline maxLength={20000} />
          <View style={[s.row, { marginBottom: 8 }]}>
            <Btn label="حفظ الدرس" onPress={() => save.mutate()} loading={save.isPending} disabled={!title.trim()} />
            <QuizBuilder
              courseId={courseId}
              endpoint={`/api/teacher/lessons/${lesson.id}/quiz`}
              existing={lesson.quiz}
              label={lesson.quiz ? 'تعديل الاختبار' : 'إضافة اختبار'}
            />
          </View>

          <Text style={s.label}>المواد والمرفقات</Text>
          {lesson.attachments.length === 0 && <Text style={{ color: c.inkSoft, marginBottom: 8 }}>لا توجد مواد بعد</Text>}
          {lesson.attachments.map((attachment) => (
            <View
              key={attachment.id}
              style={[s.row, { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.line }]}
            >
              <View style={{ flexShrink: 1 }}>
                <Text style={{ fontWeight: '600' }}>{attachment.title}</Text>
                <Text style={{ color: c.inkSoft, fontSize: 12 }}>{attachment.fileType}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <MiniBtn label="فتح" onPress={() => void openAttachment(attachment)} />
                <MiniBtn
                  label="حذف"
                  tone="danger"
                  onPress={() =>
                    Alert.alert('حذف المادة', attachment.title, [
                      { text: 'إلغاء', style: 'cancel' },
                      {
                        text: 'حذف',
                        style: 'destructive',
                        onPress: () => removeAttachment.mutate(attachment.id),
                      },
                    ])
                  }
                />
              </View>
            </View>
          ))}
          <Field label="عنوان المادة (اختياري)" value={materialTitle} onChange={setMaterialTitle} />
          <Btn label="اختيار ملف ورفعه" onPress={() => void uploadMaterial()} loading={uploadBusy} />
          <Text style={s.label}>أو إضافة رابط</Text>
          <Field label="الرابط" value={materialUrl} onChange={setMaterialUrl} dir="ltr" placeholder="https://" />
          <Btn
            label="إضافة الرابط"
            variant="ghost"
            onPress={() => addLink.mutate()}
            loading={addLink.isPending}
            disabled={!materialUrl.trim()}
          />
          {error && <ErrorBox error={error} />}
        </View>
      ) : null}
    </View>
  );
}

// ponytail: quiz images can be kept but not added on mobile; add an image picker when requested.
function QuizBuilder({
  courseId,
  endpoint,
  existing,
  label,
}: {
  courseId: string;
  endpoint: string;
  existing: TeacherQuiz | null;
  label: string;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('اختبار');
  const [questions, setQuestions] = useState<QuizFormQuestion[]>([blankQuestion()]);
  const [formError, setFormError] = useState<string | null>(null);
  const upsert = useMutation({
    mutationFn: () =>
      api(endpoint, {
        body: {
          title: title.trim(),
          questions: questions.map((question) => ({
            questionType: question.questionType,
            prompt: question.prompt.trim(),
            imageKey: question.imageKey,
            options:
              question.questionType === 'MCQ'
                ? question.options.map((option) => option.trim())
                : undefined,
            correctAnswer:
              question.questionType === 'MCQ'
                ? (question.options[question.correctIndex ?? -1] ?? '').trim()
                : question.correctBool,
            points: 1,
          })),
        },
      }),
    onSuccess: () => {
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ['teacher-curriculum', courseId] });
    },
  });

  const show = () => {
    setTitle(existing?.title ?? 'اختبار');
    setQuestions(existing?.questions.length ? existing.questions.map(formQuestion) : [blankQuestion()]);
    setFormError(null);
    setOpen(true);
  };

  const update = (index: number, patch: Partial<QuizFormQuestion>) =>
    setQuestions((current) =>
      current.map((question, currentIndex) =>
        currentIndex === index ? { ...question, ...patch } : question,
      ),
    );

  const save = () => {
    const valid =
      title.trim() &&
      questions.length > 0 &&
      questions.every((question) => {
        if (!question.prompt.trim() && !question.imageKey) return false;
        if (question.questionType === 'MCQ') {
          return (
            question.options.length >= 2 &&
            question.options.every((option) => option.trim()) &&
            question.correctIndex !== null
          );
        }
        return question.correctBool === 'true' || question.correctBool === 'false';
      });
    if (!valid) {
      setFormError('أكمل عنوان الاختبار ونص كل سؤال والإجابة الصحيحة.');
      return;
    }
    setFormError(null);
    upsert.mutate();
  };

  return (
    <>
      <MiniBtn label={label} onPress={show} />
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={s.pageContent} keyboardShouldPersistTaps="handled">
            <Text style={s.h1}>{existing ? 'تعديل الاختبار' : 'اختبار جديد'}</Text>
            <Field label="عنوان الاختبار" value={title} onChange={setTitle} maxLength={160} />
            {questions.map((question, index) => (
              <Card key={question.id}>
                <View style={[s.row, { alignItems: 'flex-start' }]}>
                  <Text style={s.h2}>سؤال {index + 1}</Text>
                  {questions.length > 1 ? (
                    <MiniBtn
                      label="حذف"
                      tone="danger"
                      onPress={() =>
                        setQuestions((current) => current.filter((_, i) => i !== index))
                      }
                    />
                  ) : null}
                </View>
                <Choice
                  label="نوع السؤال"
                  value={question.questionType}
                  onChange={(value) =>
                    update(index, {
                      questionType: value,
                      correctIndex: null,
                      correctBool: value === 'TRUE_FALSE' ? 'true' : '',
                    })
                  }
                  options={[
                    { value: 'MCQ', label: 'اختيار من متعدد' },
                    { value: 'TRUE_FALSE', label: 'صح أو خطأ' },
                  ]}
                />
                <Field
                  label="نص السؤال"
                  value={question.prompt}
                  onChange={(value) => update(index, { prompt: value })}
                  multiline
                  maxLength={1000}
                />
                {question.questionType === 'MCQ' ? (
                  <>
                    <Text style={s.label}>الخيارات (اختر الصحيح)</Text>
                    {question.options.map((option, optionIndex) => (
                      <View key={optionIndex} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Pressable
                          accessibilityRole="radio"
                          accessibilityState={{ selected: question.correctIndex === optionIndex }}
                          onPress={() => update(index, { correctIndex: optionIndex })}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 14,
                            borderWidth: 2,
                            borderColor: question.correctIndex === optionIndex ? c.primary : c.line,
                            backgroundColor: question.correctIndex === optionIndex ? c.primary : c.card,
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <Field
                            label={`الخيار ${optionIndex + 1}`}
                            value={option}
                            onChange={(value) => {
                              const options = [...question.options];
                              options[optionIndex] = value;
                              update(index, { options });
                            }}
                          />
                        </View>
                        {question.options.length > 2 ? (
                          <MiniBtn
                            label="حذف"
                            tone="danger"
                            onPress={() =>
                              update(index, {
                                options: question.options.filter((_, i) => i !== optionIndex),
                                correctIndex: null,
                              })
                            }
                          />
                        ) : null}
                      </View>
                    ))}
                    {question.options.length < 4 ? (
                      <Btn
                        label="إضافة خيار"
                        variant="ghost"
                        onPress={() => update(index, { options: [...question.options, ''] })}
                      />
                    ) : null}
                  </>
                ) : (
                  <Choice
                    label="الإجابة الصحيحة"
                    value={question.correctBool || 'true'}
                    onChange={(value) => update(index, { correctBool: value })}
                    options={[
                      { value: 'true', label: 'صح' },
                      { value: 'false', label: 'خطأ' },
                    ]}
                  />
                )}
              </Card>
            ))}
            <Btn label="إضافة سؤال" variant="ghost" onPress={() => setQuestions((current) => [...current, blankQuestion()])} />
            {formError ? <Text style={s.errText}>{formError}</Text> : null}
            {upsert.error && <ErrorBox error={upsert.error} />}
            <Btn label="حفظ الاختبار" onPress={save} loading={upsert.isPending} />
            <Btn label="إلغاء" variant="ghost" onPress={() => setOpen(false)} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
