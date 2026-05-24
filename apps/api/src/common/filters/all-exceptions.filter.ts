import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

interface RequestLike {
  url?: string;
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestLike>();
    const response = ctx.getResponse();

    const { statusCode, message, error, details } = this.resolveException(exception);

    const requestId = this.extractRequestId(request);
    const path = request?.url ?? httpAdapter.getRequestUrl(request) ?? 'unknown';

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      error,
      ...(details !== undefined ? { details } : {}),
      timestamp: new Date().toISOString(),
      path,
      ...(requestId ? { requestId } : {}),
    };

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request?.method ?? 'UNKNOWN'} ${path} -> ${statusCode} ${message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request?.method ?? 'UNKNOWN'} ${path} -> ${statusCode} ${message}`);
    }

    httpAdapter.reply(response, body, statusCode);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    message: string;
    error: string;
    details?: unknown;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return {
          statusCode: status,
          message: response,
          error: exception.name,
        };
      }

      const payload = response as Record<string, unknown>;
      const message = this.toMessage(payload.message ?? exception.message);
      const error = typeof payload.error === 'string' ? payload.error : exception.name;

      return {
        statusCode: status,
        message,
        error,
        ...(Array.isArray(payload.message) ? { details: payload.message } : {}),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaKnownError(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid database query',
        error: 'PrismaClientValidationError',
      };
    }

    if (exception instanceof Error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message || 'Internal server error',
        error: exception.name,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'UnknownError',
    };
  }

  private handlePrismaKnownError(
    exception: Prisma.PrismaClientKnownRequestError,
  ): {
    statusCode: number;
    message: string;
    error: string;
    details?: unknown;
  } {
    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Unique constraint violation',
          error: 'ConflictError',
          details: exception.meta,
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Foreign key constraint violation',
          error: 'BadRequestError',
          details: exception.meta,
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'NotFoundError',
          details: exception.meta,
        };
      default:
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Database error: ${exception.code}`,
          error: 'PrismaClientKnownRequestError',
        };
    }
  }

  private toMessage(value: unknown): string {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(', ');
    if (value && typeof value === 'object') return JSON.stringify(value);
    return 'An error occurred';
  }

  private extractRequestId(request: RequestLike | undefined): string | undefined {
    const header = request?.headers?.['x-request-id'];
    if (Array.isArray(header)) return header[0];
    return header;
  }
}
