import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { PublicController } from './public.controller';

@Module({ imports: [StorageModule], controllers: [PublicController] })
export class PublicModule {}
