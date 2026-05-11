import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      nodeEnv: process.env.NODE_ENV ?? '',
      dbTarget:
        process.env.DB_TARGET ??
        (process.env.NODE_ENV === 'production' ? 'atlas' : 'local'),
      database: this.connection.name,
      host: this.connection.host,
      readyState: this.connection.readyState,
      hasAtlasUri: Boolean(process.env.MONGO_ATLAS_URI ?? process.env.MONGO_URI),
    };
  }
}
