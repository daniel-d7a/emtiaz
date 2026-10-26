import { useState } from 'react';
import { createRoute, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Download, Lock, MessageCircle, Plus, Trash2, Unlock } from 'lucide-react';
import { api } from '../../lib/api';
import { useLang } from '../../lib/i18n';
import { Button, Card, ErrorBox, Input, Loading, Page } from '../../components/ui';
import { toCsv } from '../../lib/csv';
import type {
  TeacherGradebook as Gradebook,
  TeacherPacing as Pacing,
  TeacherRoster as Roster,
} from '../../../../shared/api';

export default function TeacherGroup() {
  const { groupId } = useParams({ from: '/teacher/groups/$groupId' });
  const { t } = useLang();
  const [tab, setTab] = useState<'pacing' | 'gradebook' | 'roster'>('pacing');

  return (
    <Page title={t('pacing')}>
      <div className="mb-5 flex flex-wrap gap-2">
        {(['pacing', 'gradebook', 'roster'] as const).map((k) => (
          <button key={k} aria-pressed={tab === k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-2 text-sm ${tab === k ? 'bg-primary text-white' : 'border border-line'}`}>
            {k === 'pacing' ? t('pacing') : k === 'gradebook' ? t('gradebook') : t('roster')}
          </button>
        ))}
      </div>
      {tab === 'pacing' && <PacingTab groupId={groupId} />}
      {tab === 'gradebook' && <GradebookTab groupId={groupId} />}
      {tab === 'roster' && <RosterTab groupId={groupId} />}
    </Page>
  );
}

export function PacingTab({ groupId }: { groupId: string }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(pacingQuery(groupId));
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['pacing', groupId] });
  const setAccess = useMutation({
    mutationFn: ({ lessonId, isUnlocked }: { lessonId: string; isUnlocked: boolean }) =>
      api(`/api/teacher/groups/${groupId}/lessons/${lessonId}/access`, { body: { isUnlocked } }),
    onSuccess: invalidate,
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;

  const flipAll = (unlock: boolean) =>
    Promise.all(
      data.lessons
        .filter((l) => l.unlocked !== unlock)
        .map((l) => api(`/api/teacher/groups/${groupId}/lessons/${l.id}/access`, { body: { isUnlocked: unlock } })),
    ).then(invalidate);

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-semibold">{t('joinCode')}:</span>
        <span dir="ltr" className="flex items-center gap-2 rounded bg-background px-2 py-1 font-bold">
          {data.group.joinCode}
          <Copy
            size={14}
            className="cursor-pointer"
            onClick={() => navigator.clipboard.writeText(`https://emtiaz.om/join?code=${data.group.joinCode}`).catch(() => {})}
          />
        </span>
      </div>
      <div className="mb-2 flex gap-2">
        <button onClick={() => flipAll(true)} className="rounded-lg bg-primary-light px-3 py-1 text-xs font-bold text-primary-dark">{t('releaseAll')}</button>
        <button onClick={() => flipAll(false)} className="rounded-lg border border-line px-3 py-1 text-xs font-bold text-ink-soft">{t('lockAll')}</button>
      </div>
      <ul className="flex flex-col divide-y divide-line">
        {data.lessons.map((l) => (
          <li key={l.id} className="flex items-center justify-between py-2">
            <span className="font-semibold">
              {l.title}
              {l.overridden && <span className="ms-2 rounded bg-secondary-light px-1.5 text-xs text-secondary">{t('released')}</span>}
            </span>
            <button
              onClick={() => setAccess.mutate({ lessonId: l.id, isUnlocked: !l.unlocked })}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${l.unlocked ? 'bg-primary-light text-primary-dark' : 'bg-line text-ink-soft'}`}
            >
              {l.unlocked ? <Unlock size={12} /> : <Lock size={12} />}
              {l.unlocked ? t('unlocked') : t('locked')}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function GradebookTab({ groupId }: { groupId: string }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['gradebook', groupId],
    queryFn: () => api<Gradebook>(`/api/teacher/groups/${groupId}/gradebook`),
  });
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['gradebook', groupId] });
  const exportCsv = () => {
    if (!data) return;
    const cell = (studentId: string, columnId: string, quiz: boolean) =>
      quiz
        ? data.quizCells[`${studentId}:${columnId}`] ?? ''
        : data.manualCells.find((c) => c.studentId === studentId && c.columnId === columnId)?.score ?? '';
    const rows: unknown[][] = [
      [
        'Student',
        ...data.quizColumns.map((c) => `${c.lessonTitle} (/${c.maxScore})`),
        ...data.manualColumns.map((c) => `${c.title}${c.maxScore ? ` (/${c.maxScore})` : ''}`),
      ],
      ...data.students.map((s) => [
        s.name,
        ...data.quizColumns.map((c) => cell(s.id, c.quizId, true)),
        ...data.manualColumns.map((c) => cell(s.id, c.id, false)),
      ]),
    ];
    const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gradebook-${data.group.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const [colTitle, setColTitle] = useState('');
  const addCol = useMutation({
    mutationFn: () => api(`/api/teacher/groups/${groupId}/gradebook/columns`, { body: { title: colTitle } }),
    onSuccess: () => { setColTitle(''); invalidate(); },
  });
  const delCol = useMutation({
    mutationFn: (columnId: string) => api(`/api/teacher/groups/${groupId}/gradebook/columns/${columnId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
  const setCell = useMutation({
    mutationFn: (v: { studentId: string; columnId: string; score: number | null }) =>
      api(`/api/teacher/groups/${groupId}/gradebook/cell`, { body: v }),
    onSuccess: invalidate,
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;

  const cellAt = (studentId: string, columnId: string, kind: 'quiz' | 'manual') =>
    kind === 'quiz'
      ? data.quizCells[`${studentId}:${columnId}`]
      : data.manualCells.find((c) => c.studentId === studentId && c.columnId === columnId)?.score ?? null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-start">
              <th className="py-2 pe-4 text-start font-bold">{t('roster')}</th>
              {data.quizColumns.map((c) => (
                <th key={c.quizId} className="py-2 pe-4 text-start text-ink-soft">
                  {c.lessonTitle} <span dir="rtl" className="text-xs">({c.maxScore})</span>
                </th>
              ))}
              {data.manualColumns.map((c) => (
                <th key={c.id} className="py-2 pe-2 text-start text-ink-soft">
                  {c.title}
                  <button aria-label={`${t('delete')} ${c.title}`} onClick={() => delCol.mutate(c.id)} className="ms-1 text-ink-soft hover:text-secondary">
                    <Trash2 size={12} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.students.map((s) => (
              <tr key={s.id} className="border-b border-line/60">
                <td className="py-2 pe-4 font-semibold">{s.name}</td>
                {data.quizColumns.map((c) => (
                  <td key={c.quizId} className="py-2 pe-4 font-bold text-primary">
                    {cellAt(s.id, c.quizId, 'quiz') ?? '—'}
                  </td>
                ))}
                {data.manualColumns.map((c) => (
                  <td key={c.id} className="py-1 pe-2">
                    <input
                      className="w-16 rounded border border-line px-2 py-1 text-sm"
                      defaultValue={cellAt(s.id, c.id, 'manual') ?? ''}
                      onBlur={(e) => {
                        const raw = e.target.value.trim();
                        setCell.mutate({ studentId: s.id, columnId: c.id, score: raw === '' ? null : Number(raw) });
                      }}
                    />
                  </td>
                ))}
              </tr>
            ))}
            {data.students.length === 0 && <tr><td className="py-3 text-ink-soft">—</td></tr>}
          </tbody>
        </table>
      </Card>
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grow">
            <Input label={t('addGradeColumn')} value={colTitle} onChange={(e) => setColTitle(e.target.value)} placeholder={t('addGradeColumn')} />
          </div>
          <Button onClick={() => addCol.mutate()} disabled={!colTitle}>
            <Plus className="inline" size={16} /> {t('add')}
          </Button>
          <Button variant="ghost" onClick={exportCsv}>
            <Download className="inline" size={16} /> {t('exportCsv')}
          </Button>
        </div>
        {addCol.error && <ErrorBox error={addCol.error} />}
      </Card>
    </div>
  );
}

export function RosterTab({ groupId }: { groupId: string }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['roster', groupId],
    queryFn: () => api<Roster>(`/api/teacher/groups/${groupId}/roster`),
  });
  const { data: allCourses } = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: () => api<Array<{ id: string; groups: Array<{ id: string; name: string }> }>>('/api/teacher/courses'),
    enabled: true,
  });
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['roster', groupId] });
  const [bulk, setBulk] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [announceMsg, setAnnounceMsg] = useState('');
  const announce = useMutation({
    mutationFn: () =>
      api<{ sent: number }>(`/api/teacher/groups/${groupId}/announce`, {
        body: { message: announcement },
      }),
    onSuccess: (res) => {
      setAnnouncement('');
      setAnnounceMsg(`${res.sent} notified`);
    },
  });
  const doBulk = useMutation({
    mutationFn: () =>
      api(`/api/teacher/groups/${groupId}/roster/bulk`, {
        body: {
          students: bulk
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => {
              const [name, phone] = line.split(/[,\t]/).map((p) => p.trim());
              return { name, phoneNumber: phone };
            })
            .filter((s) => s.name && s.phoneNumber),
        },
      }),
    onSuccess: (res: Array<{ created: boolean; enrolled: boolean }>) => {
      setOkMsg(`${res.filter((r) => r.enrolled).length} enrolled / ${res.filter((r) => r.created).length} new`);
      setBulk('');
      invalidate();
    },
  });
  const remove = useMutation({
    mutationFn: (studentId: string) => api(`/api/teacher/groups/${groupId}/students/${studentId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
  const move = useMutation({
    mutationFn: ({ studentId, toGroupId }: { studentId: string; toGroupId: string }) =>
      api(`/api/teacher/groups/${groupId}/students/${studentId}/move`, { body: { toGroupId } }),
    onSuccess: invalidate,
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;

  const siblingGroups = (allCourses ?? [])
    .find((c) => c.id === data.group.courseId)
    ?.groups?.filter((g) => g.id !== groupId) ?? [];
  const inviteUrl = `https://wa.me/?text=${encodeURIComponent(
    'Join my class on Emtiaz! Code: ' + data.group.joinCode + '\n' + window.location.origin + '/join/' + data.group.joinCode,
  )}`;
  const exportRoster = () => {
    const rows = [
      ['Student', 'Phone', 'Progress', 'Joined'],
      ...data.students.map((s) => [
        s.name,
        s.phoneNumber ?? '',
        `${s.progress}% (${s.completedLessons}/${s.totalLessons})`,
        s.joinedAt.slice(0, 10),
      ]),
    ];
    const blob = new Blob([`\uFEFF${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roster-${data.group.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="font-bold">{data.group.name}</h3>
          <div className="flex items-center gap-2 text-sm">
            <span dir="ltr" className="rounded bg-background px-2 py-1 font-bold">{data.group.joinCode}</span>
            <Copy size={14} className="cursor-pointer" onClick={() => navigator.clipboard.writeText(window.location.origin + '/join/' + data.group.joinCode).catch(() => {})} />
            <a href={inviteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-primary" onClick={(e) => e.stopPropagation()}>
              <MessageCircle size={14} /> WhatsApp
            </a>
            <button onClick={exportRoster} className="flex items-center gap-1 font-semibold text-primary" aria-label={t('download')}>
              <Download size={14} /> CSV
            </button>
          </div>
        </div>
        <p className="mt-2 text-sm text-ink-soft">{t('oneStepJoin')}</p>
      </Card>
      <Card>
        <h3 className="font-bold">{t('announce')}</h3>
        <textarea
          className="mt-2 min-h-20 w-full rounded-lg border border-line px-3 py-2 text-sm"
          placeholder={t('announcePlaceholder')}
          value={announcement}
          onChange={(e) => { setAnnouncement(e.target.value); setAnnounceMsg(''); }}
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={() => announce.mutate()}
            disabled={!announcement.trim() || announce.isPending}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t('send')}
          </button>
          {announceMsg && <span className="text-sm font-semibold text-primary">{announceMsg}</span>}
          {announce.error && <ErrorBox error={announce.error} />}
        </div>
      </Card>
      <Card>
        <ul className="flex flex-col divide-y divide-line">
          {data.students.map((s) => (
            <li key={s.studentId} className="flex items-center justify-between py-2">
              <span className="font-semibold">
                {s.name}
                {s.phoneNumber && <span dir="ltr" className="ms-2 text-sm text-ink-soft">{s.phoneNumber}</span>}
                <span className="ms-2 text-xs text-ink-soft">{s.progress}% ({s.completedLessons}/{s.totalLessons})</span>
              </span>
              <span className="flex items-center gap-2 text-xs">
                {siblingGroups.length > 0 && (
                  <select
                    className="rounded border border-line px-2 py-1 text-xs"
                    defaultValue=""
                    onChange={(e) => e.target.value && move.mutate({ studentId: s.studentId, toGroupId: e.target.value })}
                  >
                    <option value="">{t('moveTo')}</option>
                    {siblingGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}
                <button aria-label={`${t('delete')} ${s.name}`} onClick={() => remove.mutate(s.studentId)} className="text-ink-soft hover:text-secondary" title={t('delete')}>
                  <Trash2 size={14} />
                </button>
              </span>
            </li>
          ))}
          {data.students.length === 0 && <li className="py-2 text-ink-soft">—</li>}
        </ul>
        {(doBulk.error || remove.error || move.error) && <ErrorBox error={doBulk.error ?? remove.error ?? move.error} />}
      </Card>
      <Card>
        <Input
          label={t('bulkAdd')}
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          placeholder={`Ali Salem, 91234567\nFatma Salim, 92345678`}
        />
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={() => doBulk.mutate()} disabled={!bulk.trim()}>
            <Plus className="inline" size={16} /> {t('save')}
          </Button>
          {okMsg && <span className="text-sm font-semibold text-primary">{okMsg}</span>}
        </div>
      </Card>
    </div>
  );
}

import { rootRoute } from '../../routes/__root';
import { requireRole } from '../../lib/session';
import { queryClient } from '../../lib/queryClient';

export const pacingQuery = (groupId: string) => ({
  queryKey: ['pacing', groupId] as const,
  queryFn: () => api<Pacing>(`/api/teacher/groups/${groupId}/pacing`),
});

export const teacherGroupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/teacher/groups/$groupId',
  beforeLoad: () => requireRole('TEACHER'),
  loader: ({ params }) => queryClient.ensureQueryData(pacingQuery(params.groupId)),
  component: TeacherGroup,
});
