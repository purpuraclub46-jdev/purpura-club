import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

interface RequestLike {
  method?: string;
  url?: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

interface ResponseLike {
  statusCode?: number;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<RequestLike>();
    const response = http.getResponse<ResponseLike>();

    const method = request.method ?? 'UNKNOWN';
    const url = request.url ?? 'unknown';
    const userAgentHeader = request.headers?.['user-agent'];
    const userAgent = Array.isArray(userAgentHeader)
      ? userAgentHeader[0]
      : (userAgentHeader ?? 'unknown');

    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startedAt;
          this.logger.log(
            `${method} ${url} ${response.statusCode ?? 200} ${duration}ms - ${userAgent}`,
          );
        },
        error: (error: Error) => {
          const duration = Date.now() - startedAt;
          this.logger.error(
            `${method} ${url} FAILED ${duration}ms - ${error.message}`,
          );
        },
      }),
    );
  }
}
