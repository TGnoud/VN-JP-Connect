import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { DevService } from './dev.service';
import { validateTestEmailBody } from './dev.validation';

@Controller('dev')
export class DevController {
  constructor(private readonly devService: DevService) {}

  /**
   * GET only exists so browsers don’t show a confusing 404 — real send is POST.
   */
  @Get('test-email')
  testEmailWrongMethod() {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'This endpoint is only available outside production.',
      );
    }
    throw new HttpException(
      'Use POST with Content-Type: application/json and body {"email":"you@example.com"}. Opening this URL in a browser sends GET only — use curl or Postman with POST.',
      HttpStatus.METHOD_NOT_ALLOWED,
    );
  }

  /**
   * Development-only Resend smoke test. Disabled when NODE_ENV === 'production'.
   */
  @Post('test-email')
  async testEmail(@Body() body: unknown) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'This endpoint is only available outside production.',
      );
    }

    const input = validateTestEmailBody(body);
    return this.devService.sendTestEmail(input);
  }
}
