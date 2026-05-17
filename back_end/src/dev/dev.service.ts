import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import type { TestEmailBody } from './dev.validation';

const TEST_BODY_HTML =
  '<p>Test email from VN-JP Connect. Resend connectivity is working.</p>';

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
        'RESEND_API_KEY is missing - add it to .env for Resend.',
      );
    }

    const from = process.env.RESEND_FROM_EMAIL?.trim();
    if (!from) {
      throw new BadRequestException(
        'RESEND_FROM_EMAIL is missing - use a verified sender.',
      );
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: input.email,
          subject: '[DEV] VN-JP Connect - Resend connectivity test',
          html: TEST_BODY_HTML,
        }),
      });
      const body = (await response.json().catch(() => null)) as
        | { id?: string | null; message?: string; error?: string }
        | null;

      if (!response.ok) {
        const message =
          body?.message ?? body?.error ?? `HTTP ${response.status}`;
        this.logger.warn(
          `Resend test-email failed for ${input.email}: ${message}`,
        );
        throw new BadGatewayException(`Resend error: ${message}`);
      }

      return {
        success: true,
        messageId: body?.id ?? '',
      };
    } catch (err: unknown) {
      if (
        err instanceof BadGatewayException ||
        err instanceof BadRequestException
      ) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Resend test-email threw for ${input.email}: ${msg}`);
      throw new BadGatewayException(`Upstream error: ${msg}`);
    }
  }
}
