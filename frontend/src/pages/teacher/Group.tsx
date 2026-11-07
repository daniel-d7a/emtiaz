import { useEffect, useMemo, useState } from 'react';
import { createRoute, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowRightLeft, ArrowUp, ArrowUpDown, Copy, Download, Eye, EyeOff, KeyRound, Link2, Lock, MessageCircle, NotebookPen, Plus, Printer, Trash2, Unlock, Users } from 'lucide-react';
import QRCode from 'qrcode';
import {
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel,
  useReactTable, type ColumnDef, type PaginationState, type SortingState,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { formatDateTime, getWeekdayOptions, parseDays, serializeDays, useLang, type WeekdayKey } from '../../lib/i18n';
import { Badge, Button, Card, ConfirmDialog, Dialog, EmptyState, ErrorBox, IconButton, InfoHint, Input, Loading, Page, Progress, Select } from '../../components/ui';
import { toCsv } from '../../lib/csv';
import type {
  Group,
  GroupEntryCode,
  TeacherAttendance,
  TeacherCourse,
  TeacherEntryCodes,
  TeacherGradebook as Gradebook,
  TeacherGroupStats,
  TeacherPacing as Pacing,
  TeacherQuizSubmissions,
  TeacherRoster as Roster,
} from '../../../../shared/api';

export type GroupTab = 'pacing' | 'attendance' | 'gradebook' | 'roster' | 'stats' | 'entry-codes' | 'settings';
const GROUP_TABS: GroupTab[] = ['pacing', 'attendance', 'gradebook', 'roster', 'stats', 'entry-codes', 'settings'];

export default function TeacherGroup() {
  const { groupId } = useParams({ from: '/teacher/groups/$groupId' });
  const { tab: searchTab } = useSearch({ from: '/teacher/groups/$groupId' });
  const tab = searchTab ?? 'pacing';
  const { t } = useLang();
  const navigate = useNavigate();
  const pacing = useQuery(pacingQuery(groupId));

  return (
    <Page title={pacing.data?.group.name ?? t('groups')}>
      <div role="tablist" aria-label={t('groups')} className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1">
        {GROUP_TABS.map((key) => (
          <button
            key={key}
            role="tab"
            id={`group-tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`group-panel-${key}`}
            onClick={() =>
              navigate({
                to: '/teacher/groups/$groupId',
                params: { groupId },
                search: { tab: key },
              })
            }
            className={`min-h-10 shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${
              tab === key ? 'bg-primary text-white' : 'text-ink-soft hover:bg-primary-light'
            }`}
          >
            {key === 'pacing'
              ? t('pacing')
              : key === 'attendance'
                ? t('attendance')
                : key === 'gradebook'
                  ? t('gradebook')
                  : key === 'roster'
                    ? t('roster')
                    : key === 'stats'
                      ? t('stats')
                      : key === 'entry-codes'
                        ? t('entryCodes')
                        : t('settings')}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`group-panel-${tab}`} aria-labelledby={`group-tab-${tab}`}>
        {tab === 'pacing' && <PacingTab groupId={groupId} />}
        {tab === 'attendance' && <AttendanceTab groupId={groupId} />}
        {tab === 'gradebook' && <GradebookTab groupId={groupId} />}
        {tab === 'roster' && <RosterTab groupId={groupId} />}
        {tab === 'stats' && <StatsTab groupId={groupId} />}
        {tab === 'entry-codes' && <EntryCodesTab groupId={groupId} />}
        {tab === 'settings' && <SettingsTab groupId={groupId} />}
      </div>
    </Page>
  );
}

export function AttendanceTab({ groupId }: { groupId: string }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const { data: pacing, isLoading, error } = useQuery(pacingQuery(groupId));
  const lessons = pacing?.lessons ?? [];
  const [lessonId, setLessonId] = useState('');
  const [marks, setMarks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!lessonId && lessons[0]) setLessonId(lessons[0].id);
  }, [lessonId, lessons]);

  const attendance = useQuery({
    queryKey: ['attendance', groupId, lessonId],
    queryFn: () => api<TeacherAttendance>(`/api/teacher/groups/${groupId}/lessons/${lessonId}/attendance`),
    enabled: Boolean(lessonId),
  });

  useEffect(() => {
    if (!attendance.data) return;
    setMarks(
      Object.fromEntries(
        attendance.data.students
          .filter((student) => student.isPresent !== null)
          .map((student) => [student.studentId, student.isPresent as boolean]),
      ),
    );
  }, [attendance.data]);

  const save = useMutation({
    mutationFn: () =>
      api(`/api/teacher/groups/${groupId}/lessons/${lessonId}/attendance`, {
        method: 'PUT',
        body: {
          records: Object.entries(marks).map(([studentId, isPresent]) => ({ studentId, isPresent })),
        },
      }),
    onSuccess: () => {
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: ['attendance', groupId, lessonId] });
      void qc.invalidateQueries({ queryKey: ['group-stats', groupId] });
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-56 flex-1">
          <Select
            label={t('selectLesson')}
            value={lessonId}
            onChange={(e) => setLessonId(e.target.value)}
          >
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>{lesson.title}</option>
            ))}
          </Select>
        </div>
        {attendance.data && attendance.data.students.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              className="!min-h-9 !px-3"
              onClick={() =>
                setMarks(Object.fromEntries(attendance.data!.students.map((student) => [student.studentId, true])))
              }
            >
              {t('markAllPresent')}
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || Object.keys(marks).length === 0}>
              {t('save')}
            </Button>
          </div>
        )}
      </div>

      {lessons.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">{t('noLatestLesson')}</p>
      ) : !lessonId ? (
        <p className="mt-4 text-sm text-ink-soft">{t('attendanceHint')}</p>
      ) : attendance.isLoading ? (
        <div className="mt-4"><Loading /></div>
      ) : attendance.error ? (
        <div className="mt-4"><ErrorBox error={attendance.error} /></div>
      ) : attendance.data && attendance.data.students.length === 0 ? (
        <p className="mt-4 text-sm text-ink-soft">{t('noStudentsRoster')}</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-line">
          {attendance.data?.students.map((student) => {
            const mark = marks[student.studentId];
            return (
              <li key={student.studentId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="font-semibold">{student.name}</span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    aria-pressed={mark === true}
                    onClick={() => setMarks((prev) => ({ ...prev, [student.studentId]: true }))}
                    className={`min-h-8 rounded-full px-3 py-1 text-xs font-bold ${mark === true ? 'bg-primary text-white' : 'bg-line text-ink-soft'}`}
                  >
                    {t('present')}
                  </button>
                  <button
                    type="button"
                    aria-pressed={mark === false}
                    onClick={() => setMarks((prev) => ({ ...prev, [student.studentId]: false }))}
                    className={`min-h-8 rounded-full px-3 py-1 text-xs font-bold ${mark === false ? 'bg-danger text-white' : 'bg-line text-ink-soft'}`}
                  >
                    {t('absent')}
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {save.error && <div className="mt-3"><ErrorBox error={save.error} /></div>}
    </Card>
  );
}

export function PacingTab({ groupId }: { groupId: string }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(pacingQuery(groupId));
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['pacing', groupId] });
  const setAccess = useMutation({
    mutationFn: ({ lessonId, ...body }: { lessonId: string; isUnlocked?: boolean; isHidden?: boolean }) =>
      api(`/api/teacher/groups/${groupId}/lessons/${lessonId}/access`, { body }),
    onSuccess: () => {
      toast.success(t('saved'));
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });
  const setQuizHidden = useMutation({
    mutationFn: ({ quizId, isHidden }: { quizId: string; isHidden: boolean }) =>
      api(`/api/teacher/groups/${groupId}/quizzes/${quizId}/visibility`, { body: { isHidden } }),
    onSuccess: () => {
      toast.success(t('saved'));
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });
  const flipAll = useMutation({
    mutationFn: (isUnlocked: boolean) =>
      Promise.all(
        (data?.lessons ?? [])
          .filter((lesson) => lesson.unlocked !== isUnlocked)
          .map((lesson) =>
            api(`/api/teacher/groups/${groupId}/lessons/${lesson.id}/access`, {
              body: { isUnlocked },
            }),
          ),
      ),
    onSuccess: () => {
      toast.success(t('saved'));
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;

  const copy = (value: string) =>
    navigator.clipboard.writeText(value).then(
      () => toast.success(t('copied')),
      () => toast.error(t('errorOccurred')),
    );
  const joinUrl = `${window.location.origin}/join/${data.group.joinCode}`;
  const scopeLabel = (scope: 'course' | 'module' | 'lesson') =>
    scope === 'course' ? t('finalQuiz') : scope === 'module' ? t('modules') : t('lessons');

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold">{data.group.name}</h3>
            <p className="text-sm text-ink-soft">
              {[data.group.days, data.group.time].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
          <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-bold text-primary-dark">
            {data.group.isActive ? t('active') : t('suspended')}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span dir="ltr" className="rounded bg-background px-3 py-2 font-bold">{data.group.joinCode}</span>
          <Button variant="ghost" className="!min-h-9 !px-3" onClick={() => copy(data.group.joinCode)}>
            <Copy className="inline" size={15} /> {t('copyJoinCode')}
          </Button>
          <Button variant="ghost" className="!min-h-9 !px-3" onClick={() => copy(joinUrl)}>
            <Link2 className="inline" size={15} /> {t('copyJoinLink')}
          </Button>
          {/* <a href={joinUrl} target="_blank" rel="noreferrer" dir="ltr" className="min-w-0 truncate text-sm font-semibold text-primary underline">
            {joinUrl}
          </a> */}
        </div>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold">{t('lessons')}</h3>
            <InfoHint title={t('hintPacingTitle')} hint={t('hintPacingBody')} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="!min-h-9 !px-3" onClick={() => flipAll.mutate(true)} disabled={flipAll.isPending}>
              <Unlock className="inline" size={15} /> {t('releaseAll')}
            </Button>
            <Button variant="ghost" className="!min-h-9 !px-3" onClick={() => flipAll.mutate(false)} disabled={flipAll.isPending}>
              <Lock className="inline" size={15} /> {t('lockAll')}
            </Button>
          </div>
        </div>
        {flipAll.error && <div className="mt-2"><ErrorBox error={flipAll.error} /></div>}
        {data.lessons.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">—</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-line">
            {data.lessons.map((lesson) => (
              <li key={lesson.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className={`min-w-0 font-semibold ${lesson.hidden ? 'text-ink-soft line-through' : ''}`}>
                  {lesson.title}
                  {lesson.hidden && <span className="ms-2 rounded bg-line px-1.5 text-xs no-underline">{t('hidden')}</span>}
                  {lesson.overridden && lesson.unlocked && !lesson.hidden && <span className="ms-2 rounded bg-secondary-light px-1.5 text-xs text-secondary">{t('released')}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAccess.mutate({ lessonId: lesson.id, isHidden: !lesson.hidden })}
                    disabled={setAccess.isPending}
                    className="flex min-h-8 items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-bold text-ink-soft hover:border-primary hover:text-primary disabled:opacity-50"
                  >
                    {lesson.hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                    {lesson.hidden ? t('show') : t('hide')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccess.mutate({ lessonId: lesson.id, isUnlocked: !lesson.unlocked })}
                    disabled={setAccess.isPending}
                    className={`flex min-h-8 items-center gap-1 rounded-full px-3 py-1 text-xs font-bold disabled:opacity-50 ${lesson.unlocked ? 'bg-primary-light text-primary-dark' : 'bg-line text-ink-soft'}`}
                  >
                    {lesson.unlocked ? <Unlock size={12} /> : <Lock size={12} />}
                    {lesson.unlocked ? t('unlocked') : t('locked')}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h3 className="font-bold">{t('quizzes')}</h3>
        {data.quizzes.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">—</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-line">
            {data.quizzes.map((quiz) => (
              <li key={quiz.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className={`flex min-w-0 items-center gap-2 font-semibold ${quiz.hidden ? 'text-ink-soft line-through' : ''}`}>
                  <NotebookPen size={15} className="shrink-0 text-primary" />
                  <span className="min-w-0 truncate">{quiz.title}</span>
                  <span className="shrink-0 text-xs font-normal text-ink-soft no-underline">
                    {quiz.contextTitle} · {scopeLabel(quiz.scope)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setQuizHidden.mutate({ quizId: quiz.id, isHidden: !quiz.hidden })}
                  disabled={setQuizHidden.isPending}
                  className="flex min-h-8 shrink-0 items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-bold text-ink-soft hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {quiz.hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                  {quiz.hidden ? t('show') : t('hide')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
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
        t('roster'),
        t('attendance'),
        ...data.quizColumns.map((c) => `${c.lessonTitle} (/${c.maxScore})`),
        ...data.manualColumns.map((c) => `${c.title}${c.maxScore ? ` (/${c.maxScore})` : ''}`),
      ],
      ...data.students.map((s) => [
        s.name,
        `${data.attendance[s.id] ?? 0}%`,
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
  const setCell = useMutation({
    mutationFn: (v: { studentId: string; columnId: string; score: number | null }) =>
      api(`/api/teacher/groups/${groupId}/gradebook/cell`, { method: 'PUT', body: v }),
    onSuccess: invalidate,
  });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 12 });
  const [submissionsFor, setSubmissionsFor] = useState<{ quizId: string; title: string } | null>(null);
  const manualScore = (studentId: string, columnId: string) =>
    data?.manualCells.find((c) => c.studentId === studentId && c.columnId === columnId)?.score ?? null;
  const columns = useMemo<ColumnDef<Gradebook['students'][number]>[]>(() => {
    if (!data) return [];
    const cols: ColumnDef<Gradebook['students'][number]>[] = [
      {
        id: 'name',
        accessorKey: 'name',
        header: t('roster'),
        cell: ({ getValue }) => <span className="font-semibold">{String(getValue())}</span>,
      },
      {
        id: 'attendance',
        accessorFn: (s) => data.attendance[s.id] ?? 0,
        header: t('attendance'),
        cell: ({ getValue }) => <span className="font-bold tabular-nums">{String(getValue())}%</span>,
      },
    ];
    for (const c of data.quizColumns) {
      cols.push({
        id: `quiz-${c.quizId}`,
        header: `${c.lessonTitle} (${c.maxScore})`,
        accessorFn: (s) => data.quizCells[`${s.id}:${c.quizId}`] ?? null,
        cell: ({ getValue }) => (
          <button
            type="button"
            title={t('viewSubmissions')}
            onClick={() => setSubmissionsFor({ quizId: c.quizId, title: c.lessonTitle })}
            className="font-bold tabular-nums text-primary hover:underline"
          >
            {(getValue() as number | null) ?? '—'}
          </button>
        ),
      });
    }
    for (const c of data.manualColumns) {
      cols.push({
        id: `manual-${c.id}`,
        header: c.title,
        accessorFn: (s) => manualScore(s.id, c.id),
        enableSorting: false,
        cell: ({ row }) => (
          <input
            className="w-16 rounded border border-line px-2 py-1 text-end text-sm tabular-nums"
            defaultValue={manualScore(row.original.id, c.id) ?? ''}
            onBlur={(e) => {
              const raw = e.target.value.trim();
              setCell.mutate({ studentId: row.original.id, columnId: c.id, score: raw === '' ? null : Number(raw) });
            }}
          />
        ),
      });
    }
    return cols;
  }, [data, t]);
  const table = useReactTable({
    data: data?.students ?? [],
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: (value) => {
      setGlobalFilter(value);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      <Card className="!p-0">
        <div className="flex flex-wrap items-end gap-2 p-3">
          <div className="min-w-0 grow">
            <Input
              label={t('search')}
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                setPagination((p) => ({ ...p, pageIndex: 0 }));
              }}
              placeholder={t('roster')}
            />
          </div>
          <InfoHint title={t('hintGradebookTitle')} hint={t('hintGradebookBody')} />
          <Button variant="ghost" onClick={exportCsv}>
            <Download className="inline" size={16} /> {t('exportCsv')}
          </Button>
        </div>
        <div className="max-h-[70vh] overflow-auto border-y border-line">
          <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-surface">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      aria-sort={
                        header.column.getIsSorted() === 'asc'
                          ? 'ascending'
                          : header.column.getIsSorted() === 'desc' ? 'descending' : undefined
                      }
                      className={`sticky top-0 z-20 whitespace-nowrap border-b border-line bg-surface px-3 py-2 ${
                        header.column.id === 'name' ? 'start-0 z-30 min-w-40 text-start' : 'text-end'
                      }`}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 font-bold"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' ? (
                            <ArrowUp size={13} />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ArrowDown size={13} />
                          ) : (
                            <ArrowUpDown size={13} className="text-ink-soft" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-line/60">
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={`border-b border-line/60 px-3 py-2 ${
                        cell.column.id === 'name'
                          ? 'sticky start-0 z-10 min-w-40 bg-surface font-semibold'
                          : 'text-end tabular-nums'
                      }`}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {table.getRowModel().rows.length === 0 && (
            <div className="p-3">
              <EmptyState
                title={data.students.length === 0 ? t('noStudentsRoster') : t('noResults')}
                icon={Users}
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
          <span className="text-ink-soft tabular-nums">
            {table.getState().pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="!min-h-9 !px-3"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              {t('previous')}
            </Button>
            <Button
              variant="ghost"
              className="!min-h-9 !px-3"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              {t('next')}
            </Button>
          </div>
        </div>
      </Card>
      {submissionsFor && (
        <QuizSubmissionsDialog
          groupId={groupId}
          quizId={submissionsFor.quizId}
          title={submissionsFor.title}
          onClose={() => setSubmissionsFor(null)}
        />
      )}
    </div>
  );
}

function QuizSubmissionsDialog({ groupId, quizId, title, onClose }: {
  groupId: string;
  quizId: string;
  title: string;
  onClose: () => void;
}) {
  const { t } = useLang();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['quiz-submissions', groupId, quizId],
    queryFn: () => api<TeacherQuizSubmissions>(`/api/teacher/groups/${groupId}/quizzes/${quizId}/submissions`),
  });
  const [grades, setGrades] = useState<Record<string, Record<string, string>>>({});
  useEffect(() => {
    if (!data) return;
    setGrades(Object.fromEntries(
      data.submissions.map((submission) => [
        submission.id,
        Object.fromEntries(
          Object.entries(submission.writtenGrades ?? {}).map(([questionId, value]) => [questionId, String(value)]),
        ),
      ]),
    ));
  }, [data]);
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['quiz-submissions', groupId, quizId] });
    void qc.invalidateQueries({ queryKey: ['gradebook', groupId] });
  };
  const grade = useMutation({
    mutationFn: ({ attemptId, values }: { attemptId: string; values: Record<string, number> }) =>
      api(`/api/teacher/quiz-attempts/${attemptId}/grade`, { method: 'PUT', body: { grades: values } }),
    onSuccess: () => {
      toast.success(t('saved'));
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });

  return (
    <Dialog
      open
      onOpenChange={(next) => !next && onClose()}
      title={`${t('submissions')}: ${title}`}
      className="!max-w-4xl"
    >
      <div className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
        {isLoading ? <Loading /> : error ? <ErrorBox error={error} /> : !data ? null : data.submissions.length === 0 ? (
          <p className="text-sm text-ink-soft">{t('noSubmissions')}</p>
        ) : data.submissions.map((submission) => {
          const written = data.questions.filter((q) => q.questionType === 'WRITTEN');
          const values = grades[submission.id] ?? {};
          return (
            <Card key={submission.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold">{submission.student.name}</span>
                <span className="flex items-center gap-2 text-sm text-ink-soft">
                  {submission.pending && <Badge>{t('pending')}</Badge>}
                  <span className="tabular-nums">{submission.score}/{submission.maxScore}</span>
                </span>
              </div>
              {data.questions.map((question) => (
                <div key={question.id} className="flex flex-col gap-1 border-t border-line pt-2">
                  <p className="text-sm font-semibold">{question.prompt}</p>
                  <p className="text-sm text-ink-soft">{submission.answers[question.id] || t('notAnswered')}</p>
                  {question.questionType === 'WRITTEN' && (
                    <Input
                      label={`${t('grade')} (0 - ${question.points ?? 10})`}
                      type="number"
                      min={0}
                      max={question.points ?? 10}
                      value={values[question.id] ?? ''}
                      onChange={(e) =>
                        setGrades((current) => ({
                          ...current,
                          [submission.id]: { ...current[submission.id], [question.id]: e.target.value },
                        }))
                      }
                    />
                  )}
                </div>
              ))}
              {written.length > 0 && (
                <Button
                  className="self-start"
                  disabled={grade.isPending || written.some((q) => values[q.id] === undefined || values[q.id] === '')}
                  onClick={() =>
                    grade.mutate({
                      attemptId: submission.id,
                      values: Object.fromEntries(written.map((q) => [q.id, Number(values[q.id])])),
                    })
                  }
                >
                  {t('saveGrades')}
                </Button>
              )}
            </Card>
          );
        })}
      </div>
    </Dialog>
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
  const [announcement, setAnnouncement] = useState('');
  const [announceMsg, setAnnounceMsg] = useState('');
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [moveTarget, setMoveTarget] = useState<{ id: string; name: string } | null>(null);
  const [moveTo, setMoveTo] = useState('');
  const announce = useMutation({
    mutationFn: () =>
      api<{ sent: number }>(`/api/teacher/groups/${groupId}/announce`, {
        body: { message: announcement },
      }),
    onSuccess: (res) => {
      setAnnouncement('');
      setAnnounceMsg(`${res.sent} notified`);
      toast.success(t('sent'));
    },
  });
  const remove = useMutation({
    mutationFn: (studentId: string) => api(`/api/teacher/groups/${groupId}/students/${studentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success(t('deleted'));
      invalidate();
    },
  });
  const move = useMutation({
    mutationFn: ({ studentId, toGroupId }: { studentId: string; toGroupId: string }) =>
      api(`/api/teacher/groups/${groupId}/students/${studentId}/move`, { body: { toGroupId } }),
    onSuccess: () => {
      setMoveTarget(null);
      setMoveTo('');
      toast.success(t('saved'));
      invalidate();
    },
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;

  const siblingGroups = (allCourses ?? [])
    .find((c) => c.id === data.group.courseId)
    ?.groups?.filter((g) => g.id !== groupId) ?? [];
  const inviteUrl = `https://wa.me/?text=${encodeURIComponent(
    (data.group.whatsappMessage || t('joinMessage')) +
      data.group.joinCode +
      '\n' +
      window.location.origin +
      '/join/' +
      data.group.joinCode,
  )}`;
  const exportRoster = () => {
    const rows = [
      [t('roster'), t('phone'), t('progress'), t('joined')],
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
            <IconButton
              label={t('copyWhatsapp')}
              onClick={() => {
                navigator.clipboard.writeText(window.location.origin + '/join/' + data.group.joinCode)
                  .then(() => toast.success(t('copied')))
                  .catch(() => toast.error(t('errorOccurred')));
              }}
            >
              <Copy size={16} />
            </IconButton>
            <a href={inviteUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-primary" onClick={(e) => e.stopPropagation()}>
              <MessageCircle size={14} /> WhatsApp
            </a>
            <button onClick={exportRoster} className="flex items-center gap-1 font-semibold text-primary" aria-label={t('download')} title={t('download')}>
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
        <h3 className="font-bold">{t('students')}</h3>
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {data.students.map((s) => (
            <li key={s.studentId} className="flex items-center justify-between py-2">
              <span className="font-semibold">
                {s.name}
                {s.phoneNumber && <span dir="ltr" className="ms-2 text-sm text-ink-soft">{s.phoneNumber}</span>}
                <span className="ms-2 text-xs text-ink-soft tabular-nums">{s.progress}% ({s.completedLessons}/{s.totalLessons})</span>
              </span>
              <span className="flex items-center gap-2 text-xs">
                {siblingGroups.length > 0 && (
                  <IconButton
                    label={`${t('moveStudent')} ${s.name}`}
                    onClick={() => {
                      setMoveTarget({ id: s.studentId, name: s.name });
                      setMoveTo('');
                    }}
                  >
                    <ArrowRightLeft size={14} />
                  </IconButton>
                )}
                <IconButton
                  label={`${t('revokeAccess')} ${s.name}`}
                  onClick={() => setRemoveTarget({ id: s.studentId, name: s.name })}
                  tone="danger"
                >
                  <Trash2 size={14} />
                </IconButton>
              </span>
            </li>
          ))}
          {data.students.length === 0 && <li className="py-2 text-ink-soft">—</li>}
        </ul>
        {(remove.error || move.error) && <ErrorBox error={remove.error ?? move.error} />}
      </Card>
      <Dialog
        open={Boolean(moveTarget)}
        onOpenChange={(next) => !next && setMoveTarget(null)}
        title={`${t('moveStudent')} ${moveTarget?.name ?? ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setMoveTarget(null)}>{t('cancel')}</Button>
            <Button
              disabled={!moveTo || move.isPending}
              onClick={() =>
                moveTarget && move.mutate({ studentId: moveTarget.id, toGroupId: moveTo })
              }
            >
              {t('save')}
            </Button>
          </>
        }
      >
        <Select label={t('moveTo')} value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
          <option value="">—</option>
          {siblingGroups.map((group) => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </Select>
        {move.error && <div className="mt-3"><ErrorBox error={move.error} /></div>}
      </Dialog>
      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(next) => !next && setRemoveTarget(null)}
        title={`${t('revokeAccess')} ${removeTarget?.name ?? ''}?`}
        description={t('revokeAccessHint')}
        confirmLabel={t('revokeAccess')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={() => removeTarget && remove.mutate(removeTarget.id)}
      />
    </div>
  );
}

function StatsTab({ groupId }: { groupId: string }) {
  const { t, lang } = useLang();
  const { data, isLoading, error } = useQuery({
    queryKey: ['group-stats', groupId],
    queryFn: () => api<TeacherGroupStats>(`/api/teacher/groups/${groupId}/stats`),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;

  const students = [...data.students].sort((a, b) => b.combined - a.combined);
  const hasAttendance = data.attendance.some((row) => row.present > 0);
  const startDate = new Intl.DateTimeFormat(
    lang === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB',
    { dateStyle: 'medium' },
  ).format(new Date(data.startDate));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-ink-soft">{t('startDate')}</p>
          <p className="mt-1 text-xl font-bold">{startDate}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink-soft">{t('lessonsTaken')}</p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {data.lessons.taken}/{data.lessons.total} ({data.lessons.percent}%)
          </p>
          <div className="mt-2"><Progress value={data.lessons.percent} /></div>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-ink-soft">{t('unitsTaken')}</p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {data.units.taken}/{data.units.total} ({data.units.percent}%)
          </p>
          <div className="mt-2"><Progress value={data.units.percent} /></div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StatsChart
          title={t('attendanceChart')}
          bars={
            hasAttendance
              ? data.attendance.map((row) => ({
                  label: row.title,
                  detail: `${row.moduleTitle} · ${row.present}/${row.total}`,
                  value: row.percent,
                }))
              : []
          }
          empty={t('noAttendanceYet')}
        />
        <StatsChart
          title={t('quizAverages')}
          bars={data.quizAverages.map((quiz) => ({
            label: quiz.title,
            detail: quiz.contextTitle,
            value: quiz.average,
          }))}
          empty={t('noQuizzesYet')}
        />
      </div>

      {students.length === 0 ? (
        <Card>
          <EmptyState icon={Users} title={t('noStatsStudents')} />
        </Card>
      ) : (
        <>
          <Card>
            <h3 className="font-bold">{t('podium')}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {students.slice(0, 3).map((student, index) => (
                <div
                  key={student.id}
                  className={`rounded-xl border p-3 text-center ${
                    index === 0
                      ? 'border-primary bg-primary-light'
                      : 'border-line bg-background'
                  }`}
                >
                  <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-surface font-bold tabular-nums text-primary">
                    {index + 1}
                  </span>
                  <p className="mt-2 truncate font-bold" title={student.name}>{student.name}</p>
                  <p className="mt-1 text-lg font-bold tabular-nums">{student.combined}%</p>
                  <p className="text-xs text-ink-soft">{t('combinedAverage')}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="!p-0">
            <h3 className="p-3 font-bold">{t('studentTotals')}</h3>
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full text-sm">
                <thead className="bg-surface">
                  <tr className="text-xs font-bold text-ink-soft">
                    <th className="px-3 py-2 text-start">{t('roster')}</th>
                    <th className="px-3 py-2 text-end">{t('gradeTotal')}</th>
                    <th className="px-3 py-2 text-end">{t('attendance')}</th>
                    <th className="px-3 py-2 text-end">{t('combinedAverage')}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-t border-line/60">
                      <td className="px-3 py-2 font-semibold">{student.name}</td>
                      <td className="px-3 py-2 text-end font-bold tabular-nums">
                        {student.gradePercent === null ? '—' : `${student.gradePercent}%`}
                      </td>
                      <td className="px-3 py-2 text-end font-bold tabular-nums">
                        {student.attendancePercent}%
                      </td>
                      <td className="px-3 py-2 text-end font-bold tabular-nums">
                        {student.combined}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function StatsChart({
  title, bars, empty,
}: {
  title: string;
  bars: Array<{ label: string; detail: string; value: number | null }>;
  empty: string;
}) {
  return (
    <Card>
      <h3 className="font-bold">{title}</h3>
      {bars.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">{empty}</p>
      ) : (
        <div className="mt-4 flex h-52 items-end gap-3 overflow-x-auto pb-1">
          {bars.map((bar, index) => (
            <div
              key={`${bar.label}-${index}`}
              className="flex w-20 shrink-0 flex-col items-center justify-end gap-1"
              title={bar.detail}
            >
              <span className="text-xs font-bold tabular-nums">
                {bar.value === null ? '—' : `${bar.value}%`}
              </span>
              <div className="flex h-32 w-10 items-end rounded-t bg-background">
                <div
                  className="w-full rounded-t bg-primary"
                  style={{ height: `${Math.max(0, Math.min(100, bar.value ?? 0))}%` }}
                />
              </div>
              <span className="max-h-8 max-w-20 break-words text-center text-xs leading-4">
                {bar.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function EntryCodesTab({ groupId }: { groupId: string }) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const [maxUses, setMaxUses] = useState('10');
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ['entry-codes', groupId],
    queryFn: () => api<TeacherEntryCodes>(`/api/teacher/groups/${groupId}/entry-codes`),
  });
  const courses = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: () => api<TeacherCourse[]>('/api/teacher/courses'),
  });
  const courseTitle = courses.data?.find((c) => c.groups.some((g) => g.id === groupId))?.title;
  const create = useMutation({
    mutationFn: () =>
      api(`/api/teacher/groups/${groupId}/entry-codes`, {
        body: { maxUses: Number(maxUses) },
      }),
    onSuccess: () => {
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: ['entry-codes', groupId] });
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  if (!data) return null;

  const copy = (value: string) =>
    navigator.clipboard.writeText(value).then(
      () => toast.success(t('copied')),
      () => toast.error(t('errorOccurred')),
    );

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h3 className="flex items-center gap-2 font-bold">
          <KeyRound size={18} /> {t('entryCodes')}
          <InfoHint
            title={t('hintEntryCodesTitle')}
            steps={[
              { title: t('hintEntryCodesStep1Title'), body: t('hintEntryCodesStep1Body') },
              { title: t('hintEntryCodesStep2Title'), body: t('hintEntryCodesStep2Body') },
              { title: t('hintEntryCodesStep3Title'), body: t('hintEntryCodesStep3Body') },
            ]}
          />
        </h3>
        <p className="mt-1 text-sm text-ink-soft">{t('entryCodeHint')}</p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-40">
            <Input
              label={t('maxUses')}
              type="number"
              min={1}
              max={1000}
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              dir="ltr"
            />
          </div>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending || Number(maxUses) < 1}
          >
            <Plus className="inline" size={16} /> {t('generateCode')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setPrintModalOpen(true)}
            disabled={data.codes.length === 0}
          >
            <Printer className="inline" size={16} /> {t('printQrCodes')}
          </Button>
        </div>
        {create.error && <div className="mt-3"><ErrorBox error={create.error} /></div>}
      </Card>

      {data.codes.length === 0 ? (
        <Card><p className="text-sm text-ink-soft">{t('noEntryCodes')}</p></Card>
      ) : (
        data.codes.map((code) => {
          const joinUrl = `${window.location.origin}/join/${data.group.joinCode}?entry=${encodeURIComponent(code.code)}`;
          return (
            <Card key={code.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span dir="ltr" className="rounded bg-background px-3 py-2 font-mono text-lg font-bold">
                      {code.code}
                    </span>
                    <Badge tone={code.usedUp ? 'danger' : 'primary'}>
                      {code.usedUp ? t('usedUp') : t('available')}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">
                    {t('maxUses')}: <span className="tabular-nums">{code.maxUses}</span>
                    {' · '}
                    {t('usedBy')}: <span className="tabular-nums">{code.usedCount}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="ghost" className="!min-h-9 !px-3" onClick={() => copy(code.code)}>
                      <Copy className="inline" size={16} /> {t('copyJoinCode')}
                    </Button>
                    <Button variant="ghost" className="!min-h-9 !px-3" onClick={() => copy(joinUrl)}>
                      <Link2 className="inline" size={16} /> {t('copyJoinLink')}
                    </Button>
                  </div>
                </div>
                <EntryCodeQr value={joinUrl} />
              </div>
              {code.uses.length > 0 && (
                <ul className="mt-4 flex flex-col divide-y divide-line border-t border-line pt-2">
                  {code.uses.map((use) => (
                    <li key={use.studentId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span className="font-semibold">{use.name}</span>
                      <span className="text-ink-soft">{formatDateTime(use.usedAt, lang)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })
      )}

      <PrintQrCodesDialog
        open={printModalOpen}
        onOpenChange={setPrintModalOpen}
        group={data.group}
        courseTitle={courseTitle}
        codes={data.codes}
      />
    </div>
  );
}

export function PrintQrCodesDialog({
  open,
  onOpenChange,
  group,
  courseTitle,
  codes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group;
  courseTitle?: string;
  codes: GroupEntryCode[];
}) {
  const { t } = useLang();
  const [filter, setFilter] = useState<'available' | 'all'>('available');

  const filteredCodes = useMemo(() => {
    if (filter === 'available') {
      const active = codes.filter((c) => !c.usedUp);
      return active.length > 0 ? active : codes;
    }
    return codes;
  }, [codes, filter]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('printQrCodes')}
      className="max-w-4xl"
    >
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-sheet,
          .printable-sheet * {
            visibility: visible;
          }
          .printable-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: #fff !important;
            z-index: 999999;
          }
          .printable-cards-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 16px !important;
          }
          .printable-code-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 2px dashed #444 !important;
            border-radius: 12px !important;
            padding: 16px !important;
            background: #fff !important;
            color: #000 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-ink-soft">
            {t('status')}:
          </label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'available' | 'all')}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink focus:border-primary focus:outline-none"
          >
            <option value="available">{t('printFilterActiveOnly')}</option>
            <option value="all">{t('printFilterAll')}</option>
          </select>
          <span className="text-xs text-ink-soft">
            ({filteredCodes.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.print()}
            disabled={filteredCodes.length === 0}
          >
            <Printer className="inline" size={16} /> {t('print')}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </div>
      </div>

      <div className="printable-sheet max-h-[70vh] overflow-y-auto p-1">
        {filteredCodes.length === 0 ? (
          <p className="text-center text-sm text-ink-soft py-8">{t('noEntryCodes')}</p>
        ) : (
          <div className="printable-cards-grid grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {filteredCodes.map((code) => {
              const joinUrl = `${window.location.origin}/join/${group.joinCode}?entry=${encodeURIComponent(code.code)}`;
              const remaining = Math.max(0, code.maxUses - code.usedCount);
              return (
                <PrintableEntryCard
                  key={code.id}
                  groupName={group.name}
                  courseTitle={courseTitle}
                  joinCode={group.joinCode}
                  entryCode={code.code}
                  joinUrl={joinUrl}
                  maxUses={code.maxUses}
                  remainingUses={remaining}
                  usedUp={code.usedUp}
                />
              );
            })}
          </div>
        )}
      </div>
    </Dialog>
  );
}

export function PrintableEntryCard({
  groupName,
  courseTitle,
  joinCode,
  entryCode,
  joinUrl,
  maxUses,
  remainingUses,
}: {
  groupName: string;
  courseTitle?: string;
  joinCode: string;
  entryCode: string;
  joinUrl: string;
  maxUses: number;
  remainingUses: number;
  usedUp: boolean;
}) {
  const { t } = useLang();
  const [qrSrc, setQrSrc] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(joinUrl, { width: 180, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => active && setQrSrc(url))
      .catch(() => active && setQrSrc(''));
    return () => {
      active = false;
    };
  }, [joinUrl]);

  return (
    <div className="printable-code-card flex flex-col items-center justify-between rounded-xl border-2 border-dashed border-line bg-surface p-4 text-center">
      <div className="w-full border-b border-line pb-2 mb-2">
        {courseTitle && (
          <p className="text-xs font-semibold text-primary truncate">{courseTitle}</p>
        )}
        <h4 className="text-base font-bold text-ink truncate">{groupName}</h4>
      </div>

      <div className="my-1 flex items-center justify-center">
        {qrSrc ? (
          <img
            src={qrSrc}
            width={160}
            height={160}
            alt={entryCode}
            className="size-36 rounded-lg border border-line bg-white p-1 object-contain"
          />
        ) : (
          <div className="size-36 rounded-lg border border-line bg-background animate-pulse" />
        )}
      </div>

      <div className="my-1 w-full">
        <p className="text-[11px] font-semibold text-ink-soft uppercase tracking-wider">{t('entryCodes')}</p>
        <p dir="ltr" className="font-mono text-2xl font-black tracking-widest text-primary-dark">
          {entryCode}
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          {t('groupJoinCode')}: <span dir="ltr" className="font-mono font-bold text-ink">{joinCode}</span>
        </p>
      </div>

      <div className="mt-2 w-full border-t border-line pt-2 text-xs text-ink-soft">
        <div className="flex items-center justify-center gap-1 font-semibold">
          <span>{t('remainingUses')}:</span>
          <span className="tabular-nums font-bold text-ink">{remainingUses}</span>
          <span>/</span>
          <span className="tabular-nums">{maxUses}</span>
        </div>
        <p className="mt-1 text-[11px] font-medium leading-tight text-ink-soft">
          {t('scanOrEnterCodeHint')}
        </p>
      </div>
    </div>
  );
}

function EntryCodeQr({ value }: { value: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(value, { width: 160, margin: 1 })
      .then((url) => active && setSrc(url))
      .catch(() => active && setSrc(''));
    return () => {
      active = false;
    };
  }, [value]);
  if (!src) return null;
  return <img src={src} width={160} height={160} alt="" className="rounded-lg border border-line bg-white p-1" />;
}

export function SettingsTab({ groupId }: { groupId: string }) {
  const { t } = useLang();
  const pacing = useQuery(pacingQuery(groupId));
  const gradebook = useQuery({
    queryKey: ['gradebook', groupId],
    queryFn: () => api<Gradebook>(`/api/teacher/groups/${groupId}/gradebook`),
  });

  if (pacing.isLoading) return <Loading />;
  if (pacing.error) return <ErrorBox error={pacing.error} />;
  if (!pacing.data) return null;
  const group = pacing.data.group;

  return (
    <div className="flex flex-col gap-4">
      <GroupSettingsForm
        key={[group.id, group.name, group.days, group.time, group.isActive, group.joinCode, group.whatsappMessage, group.requiresEntryCode].join('|')}
        group={group}
        groupId={groupId}
      />
      <Card>
        <h3 className="font-bold">{t('gradeColumns')}</h3>
        {gradebook.isLoading ? (
          <div className="mt-3"><Loading /></div>
        ) : gradebook.error ? (
          <div className="mt-3"><ErrorBox error={gradebook.error} /></div>
        ) : (
          <GradeColumns groupId={groupId} columns={gradebook.data?.manualColumns ?? []} />
        )}
      </Card>
    </div>
  );
}

function GroupSettingsForm({ group, groupId }: { group: Group; groupId: string }) {
  const { t, lang } = useLang();
  const qc = useQueryClient();
  const [name, setName] = useState(group.name);
  const [days, setDays] = useState<WeekdayKey[]>(() => parseDays(group.days));
  const [time, setTime] = useState(group.time ?? '');
  const [joinCode, setJoinCode] = useState(group.joinCode);
  const [whatsappMessage, setWhatsappMessage] = useState(group.whatsappMessage ?? '');
  const [isActive, setIsActive] = useState(group.isActive);
  const [requiresEntryCode, setRequiresEntryCode] = useState(group.requiresEntryCode);
  const dayOptions = getWeekdayOptions(lang);
  const toggleDay = (day: WeekdayKey) =>
    setDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  const save = useMutation({
    mutationFn: () =>
      api<Group>(`/api/teacher/groups/${groupId}`, {
        method: 'PATCH',
        body: {
          name,
          days: serializeDays(days),
          time: time.trim() || null,
          joinCode: joinCode.trim(),
          whatsappMessage: whatsappMessage.trim() || null,
          isActive,
          requiresEntryCode,
        },
      }),
    onSuccess: () => {
      toast.success(t('saved'));
      void qc.invalidateQueries({ queryKey: ['pacing', groupId] });
      void qc.invalidateQueries({ queryKey: ['teacher-courses'] });
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });
  const joinUrl = `${window.location.origin}/join/${joinCode.trim()}`;

  return (
    <Card>
      <h3 className="font-bold">{t('settings')}</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Input label={t('name')} value={name} onChange={(e) => setName(e.target.value)} />
        <Input label={t('time')} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        <Select label={t('status')} value={isActive ? 'active' : 'suspended'} onChange={(e) => setIsActive(e.target.value === 'active')}>
          <option value="active">{t('active')}</option>
          <option value="suspended">{t('suspended')}</option>
        </Select>
        <Input
          label={t('joinCode')}
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          dir="ltr"
        />
      </div>
      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-semibold text-ink-soft">{t('days')}</legend>
        <div className="flex flex-wrap gap-2">
          {dayOptions.map((day) => (
            <label
              key={day.value}
              className={`flex min-h-10 cursor-pointer items-center rounded-xl border px-3 text-sm font-semibold ${
                days.includes(day.value)
                  ? 'border-primary bg-primary-light text-primary-dark'
                  : 'border-line text-ink-soft'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={days.includes(day.value)}
                onChange={() => toggleDay(day.value)}
              />
              {day.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-3 flex items-center gap-2 text-sm font-semibold text-ink-soft">
        <input
          type="checkbox"
          checked={requiresEntryCode}
          onChange={(e) => setRequiresEntryCode(e.target.checked)}
          className="size-4 accent-primary"
        />
        <span>{t('requiresEntryCode')}</span>
        <InfoHint
          title={t('hintEntryCodesTitle')}
          steps={[
            { title: t('hintEntryCodesStep1Title'), body: t('hintEntryCodesStep1Body') },
            { title: t('hintEntryCodesStep2Title'), body: t('hintEntryCodesStep2Body') },
            { title: t('hintEntryCodesStep3Title'), body: t('hintEntryCodesStep3Body') },
          ]}
        />
      </label>
      <p className="mt-2 text-xs text-ink-soft">{t('groupNameFallback')}</p>
      <label className="mt-3 block">
        <span className="mb-1 block text-sm font-semibold text-ink-soft">{t('whatsappMessage')}</span>
        <textarea
          value={whatsappMessage}
          onChange={(e) => setWhatsappMessage(e.target.value)}
          className="min-h-24 w-full rounded-xl border border-line bg-white px-4 py-3 outline-none focus:border-primary"
          placeholder={t('joinMessage')}
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={() => save.mutate()} disabled={save.isPending || !joinCode.trim()}>
          {t('save')}
        </Button>
        <Button
          variant="ghost"
          onClick={() =>
            navigator.clipboard.writeText(joinUrl).then(
              () => toast.success(t('copied')),
              () => toast.error(t('errorOccurred')),
            )
          }
        >
          <Copy className="inline" size={16} /> {t('copyJoinLink')}
        </Button>
        {/* <a href={joinUrl} target="_blank" rel="noreferrer" dir="ltr" className="min-w-0 truncate text-sm font-semibold text-primary underline">
          {joinUrl}
        </a> */}
      </div>
      {save.error && <div className="mt-3"><ErrorBox error={save.error} /></div>}
    </Card>
  );
}

function GradeColumns({ groupId, columns }: { groupId: string; columns: Gradebook['manualColumns'] }) {
  const { t } = useLang();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [deleteColumn, setDeleteColumn] = useState<{ id: string; title: string } | null>(null);
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['gradebook', groupId] });
  const add = useMutation({
    mutationFn: () => api(`/api/teacher/groups/${groupId}/gradebook/columns`, { body: { title } }),
    onSuccess: () => {
      setTitle('');
      toast.success(t('saved'));
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });
  const remove = useMutation({
    mutationFn: (columnId: string) => api(`/api/teacher/groups/${groupId}/gradebook/columns/${columnId}`, { method: 'DELETE' }),
    onSuccess: () => {
      setDeleteColumn(null);
      toast.success(t('deleted'));
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message || t('errorOccurred')),
  });

  return (
    <>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-0 grow">
          <Input label={t('addGradeColumn')} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('addGradeColumn')} />
        </div>
        <Button onClick={() => add.mutate()} disabled={!title.trim() || add.isPending}>
          <Plus className="inline" size={16} /> {t('add')}
        </Button>
      </div>
      {columns.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">{t('noGradeColumns')}</p>
      ) : (
        <ul className="mt-3 flex flex-col divide-y divide-line">
          {columns.map((column) => (
            <li key={column.id} className="flex items-center justify-between gap-2 py-2">
              <span className="font-semibold">{column.title}</span>
              <IconButton label={`${t('delete')} ${column.title}`} onClick={() => setDeleteColumn({ id: column.id, title: column.title })} tone="danger">
                <Trash2 size={14} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      {add.error && <div className="mt-3"><ErrorBox error={add.error} /></div>}
      <ConfirmDialog
        open={Boolean(deleteColumn)}
        onOpenChange={(next) => !next && setDeleteColumn(null)}
        title={`${t('delete')} ${deleteColumn?.title ?? ''}?`}
        confirmLabel={t('delete')}
        cancelLabel={t('cancel')}
        destructive
        onConfirm={() => deleteColumn && remove.mutate(deleteColumn.id)}
      />
    </>
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
  validateSearch: (search: Record<string, unknown>): { tab?: GroupTab } => ({
    tab: GROUP_TABS.includes(search.tab as GroupTab) ? (search.tab as GroupTab) : undefined,
  }),
  loader: ({ params }) => queryClient.ensureQueryData(pacingQuery(params.groupId)),
  component: TeacherGroup,
});
