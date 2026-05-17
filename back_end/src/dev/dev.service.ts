import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Resend } from 'resend';
import type { TestEmailBody } from './dev.validation';

const TEST_BODY_HTML =
  '<p>Test email từ VN-JP Connect — Resend đang hoạt động đúng.</p>';

@Injectable()
export class DevService {
  private readonly logger = new Logger(DevService.name);

  async sendTestEmail(input: TestEmailBody): Promise<{
    success: true;
    messageId: string;
  }> {
    const apiKey = process.env.RESEND_API_KEY?.trim();
    if (!apiKey) {
      throw new BadRequestException(
        'RESEND_API_KEY is missing — add it to .env for Resend.',
      );
    }

    const from = process.env.RESEND_FROM_EMAIL?.trim();
    if (!from) {
      throw new BadRequestException(
        'RESEND_FROM_EMAIL is missing — use a verified sender (e.g. onboarding@resend.dev).',
      );
    }

    const resend = new Resend(apiKey);

    try {
      const { data, error } = await resend.emails.send({
        from,
        to: input.email,
        subject: '[DEV] VN-JP Connect — Resend connectivity test',
        html: TEST_BODY_HTML,
      });

      if (error) {
        this.logger.warn(`Resend test-email failed for ${input.email}: ${error.message}`);
        throw new BadGatewayException(
          `Resend error: ${error.message}`,
        );
      }

      return {
        success: true,
        messageId: data?.id ?? '',
      };
    } catch (err: unknown) {
      if (err instanceof BadGatewayException || err instanceof BadRequestException) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Resend test-email threw for ${input.email}: ${msg}`);
      throw new BadGatewayException(`Upstream error: ${msg}`);
    }
  }
}
