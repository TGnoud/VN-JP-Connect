import { Injectable } from '@nestjs/common';

/**
 * Kept as a compatibility provider for older imports.
 * Runtime persistence in this backend uses MongoDB/Mongoose.
 */
@Injectable()
export class PrismaService {}
