import { Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { NotificationsService } from './notifications.service';

@Controller()
export class InboxController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('api/notifications')
  list(@Req() req: Request, @Query('limit') limit?: string) {
    return this.notifications.inbox(req.user!.id, Math.max(1, Math.min(Number(limit) || 30, 100)));
  }

  @Get('api/notifications/unread-count')
  unread(@Req() req: Request) {
    return this.notifications.unreadCount(req.user!.id);
  }

  @Post('api/notifications/read-all')
  readAll(@Req() req: Request) {
    return this.notifications.markAllRead(req.user!.id);
  }

  @Post('api/notifications/:id/read')
  read(@Req() req: Request, @Param('id') id: string) {
    return this.notifications.markRead(req.user!.id, id);
  }
}
