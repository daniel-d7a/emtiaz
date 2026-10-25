import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../db';
import { parentStudents, users } from '../../db/schema';
import { StudentService } from '../student/student.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class MonthlySummaryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonthlySummaryService.name);
  private timer?: NodeJS.Timeout;
  private lastRunMonth = '';

  constructor(
    private readonly notifications: NotificationsService,
    private readonly students: StudentService,
  ) {}

  onModuleInit() {
    // ponytail: one process sends the monthly run; add a DB/Redis lock if the API is scaled out.
    this.timer = setInterval(() => void this.tick(), 6 * 60 * 60 * 1000);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick() {
    const now = new Date();
    if (now.getDate() !== 1) return;
    const month = `${now.getFullYear()}-${now.getMonth() + 1}`;
    if (this.lastRunMonth === month) return;
    this.lastRunMonth = month;
    await this.run();
  }

  async run() {
    const parent = alias(users, 'parent_user');
    const student = alias(users, 'student_user');
    const rows = await db
      .select({
        parentId: parent.id,
        parentName: parent.name,
        parentEmail: parent.email,
        parentPhone: parent.phoneNumber,
        studentId: student.id,
        studentName: student.name,
      })
      .from(parentStudents)
      .innerJoin(parent, eq(parentStudents.parentId, parent.id))
      .innerJoin(student, eq(parentStudents.studentId, student.id))
      .where(
        and(
          eq(parent.isActive, true),
          isNull(parent.deletedAt),
          isNull(student.deletedAt),
        ),
      );

    const byParent = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = byParent.get(row.parentId) ?? [];
      list.push(row);
      byParent.set(row.parentId, list);
    }

    let sent = 0;
    for (const children of byParent.values()) {
      const first = children[0];
      const parts: string[] = [];
      for (const child of children) {
        try {
          const groups = await this.students.myGroups(child.studentId);
          const avg = groups.length
            ? Math.round(groups.reduce((sum, g) => sum + g.progress, 0) / groups.length)
            : 0;
          parts.push(`${child.studentName}: ${avg}%`);
        } catch (e) {
          this.logger.error({ err: e }, 'monthly summary progress failed');
        }
      }
      if (!parts.length) continue;
      const message = `ملخص امتياز الشهري — ${parts.join(' · ')}`;
      await Promise.all([
        this.notifications.sendInApp(first.parentId, message, 'PARENT'),
        this.notifications.sendEmail(
          first.parentEmail,
          'ملخص امتياز الشهري',
          message,
          'PARENT',
        ),
        first.parentPhone
          ? this.notifications.sendWhatsApp(first.parentPhone, message, 'PARENT')
          : undefined,
      ]);
      sent += 1;
    }
    return { parents: sent };
  }
}
