import { Share, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Btn, Card, Empty, ErrorBox, Loading, MiniBtn, Text, c, s } from '../ui';
import { InfoHint } from '../components/InfoHint';
import type { TeacherPacing } from '../../../shared/api';

function scopeLabel(scope: 'course' | 'module' | 'lesson') {
  return scope === 'course' ? 'اختبار نهائي' : scope === 'module' ? 'اختبار وحدة' : 'اختبار درس';
}

export default function TeacherGroupPacing({ groupId }: { groupId: string }) {
  const qc = useQueryClient();
  const pacing = useQuery({
    queryKey: ['teacher-pacing', groupId],
    queryFn: () => api<TeacherPacing>(`/api/teacher/groups/${groupId}/pacing`),
  });
  const invalidate = () =>
    void qc.invalidateQueries({ queryKey: ['teacher-pacing', groupId] });
  const setAccess = useMutation({
    mutationFn: (value: {
      lessonId: string;
      isUnlocked?: boolean;
      isHidden?: boolean;
    }) =>
      api(`/api/teacher/groups/${groupId}/lessons/${value.lessonId}/access`, {
        method: 'PATCH',
        body: {
          ...(value.isUnlocked !== undefined ? { isUnlocked: value.isUnlocked } : {}),
          ...(value.isHidden !== undefined ? { isHidden: value.isHidden } : {}),
        },
      }),
    onSuccess: invalidate,
  });
  const setQuizHidden = useMutation({
    mutationFn: (value: { quizId: string; isHidden: boolean }) =>
      api(`/api/teacher/groups/${groupId}/quizzes/${value.quizId}/visibility`, {
        method: 'PATCH',
        body: { isHidden: value.isHidden },
      }),
    onSuccess: invalidate,
  });
  const flipAll = useMutation({
    mutationFn: (isUnlocked: boolean) =>
      Promise.all(
        (pacing.data?.lessons ?? [])
          .filter((lesson) => lesson.unlocked !== isUnlocked)
          .map((lesson) =>
            api(`/api/teacher/groups/${groupId}/lessons/${lesson.id}/access`, {
              method: 'PATCH',
              body: { isUnlocked },
            }),
          ),
      ),
    onSuccess: invalidate,
  });

  if (pacing.error) return <ErrorBox error={pacing.error} />;
  if (!pacing.data) return <Loading />;
  const data = pacing.data;

  return (
    <View>
      <Card>
        <View style={[s.row, { alignItems: 'flex-start' }]}>
          <View style={{ flexShrink: 1 }}>
            <Text style={s.h2}>{data.group.name}</Text>
            <Text style={{ color: c.inkSoft, fontSize: 13 }}>
              {[data.group.days, data.group.time].filter(Boolean).join(' · ') || 'بدون موعد'}
            </Text>
          </View>
          <Text style={s.badge}>{data.group.isActive ? 'نشطة' : 'موقوفة'}</Text>
        </View>
        <Text style={{ color: c.inkSoft, marginTop: 8 }}>
          رمز الانضمام: <Text style={{ fontWeight: '700' }}>{data.group.joinCode}</Text>
        </Text>
        <Btn
          label="مشاركة الرمز"
          variant="ghost"
          onPress={() =>
            void Share.share({
              message: `${data.group.name}\nرمز الانضمام: ${data.group.joinCode}`,
            })
          }
        />
      </Card>

      <Card>
        <View style={[s.row, { marginBottom: 8 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[s.h2, { marginBottom: 0 }]}>الدروس</Text>
            <InfoHint
              title="جدولة المحتوى وفتح الدروس"
              hint="تحكم في الدروس والاختبارات المتاحة لطلاب هذه المجموعة: يمكنك فتح الكل دفعة واحدة أو فتح كل درس تدريجياً بعد شرحه."
            />
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <MiniBtn label="فتح الكل" onPress={() => flipAll.mutate(true)} disabled={flipAll.isPending} />
            <MiniBtn label="قفل الكل" onPress={() => flipAll.mutate(false)} disabled={flipAll.isPending} />
          </View>
        </View>
        {data.lessons.length === 0 && <Empty text="لا توجد دروس بعد" />}
        {data.lessons.map((lesson) => (
          <View
            key={lesson.id}
            style={[s.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }]}
          >
            <View style={{ flexShrink: 1 }}>
              <Text
                style={{
                  fontWeight: '600',
                  color: lesson.hidden ? c.inkSoft : c.ink,
                  textDecorationLine: lesson.hidden ? 'line-through' : 'none',
                }}
              >
                {lesson.title}
              </Text>
              <Text style={{ color: c.inkSoft, fontSize: 12 }}>
                {lesson.unlocked ? 'مفتوح' : 'مقفل'}
                {lesson.hidden ? ' · مخفي' : ''}
                {lesson.overridden ? ' · تخصيص للمجموعة' : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              <MiniBtn
                label={lesson.hidden ? 'إظهار' : 'إخفاء'}
                onPress={() =>
                  setAccess.mutate({ lessonId: lesson.id, isHidden: !lesson.hidden })
                }
                disabled={setAccess.isPending}
              />
              <MiniBtn
                label={lesson.unlocked ? 'قفل' : 'فتح'}
                tone={lesson.unlocked ? 'ghost' : 'primary'}
                onPress={() =>
                  setAccess.mutate({ lessonId: lesson.id, isUnlocked: !lesson.unlocked })
                }
                disabled={setAccess.isPending}
              />
            </View>
          </View>
        ))}
        {setAccess.error && <ErrorBox error={setAccess.error} />}
        {flipAll.error && <ErrorBox error={flipAll.error} />}
      </Card>

      <Card>
        <Text style={s.h2}>الاختبارات</Text>
        {data.quizzes.length === 0 && <Empty text="لا توجد اختبارات بعد" />}
        {data.quizzes.map((quiz) => (
          <View
            key={quiz.id}
            style={[s.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: c.line }]}
          >
            <View style={{ flexShrink: 1 }}>
              <Text
                style={{
                  fontWeight: '600',
                  color: quiz.hidden ? c.inkSoft : c.ink,
                  textDecorationLine: quiz.hidden ? 'line-through' : 'none',
                }}
              >
                {quiz.title}
              </Text>
              <Text style={{ color: c.inkSoft, fontSize: 12 }}>
                {quiz.contextTitle} · {scopeLabel(quiz.scope)}
              </Text>
            </View>
            <MiniBtn
              label={quiz.hidden ? 'إظهار' : 'إخفاء'}
              onPress={() =>
                setQuizHidden.mutate({ quizId: quiz.id, isHidden: !quiz.hidden })
              }
              disabled={setQuizHidden.isPending}
            />
          </View>
        ))}
        {setQuizHidden.error && <ErrorBox error={setQuizHidden.error} />}
      </Card>
    </View>
  );
}
