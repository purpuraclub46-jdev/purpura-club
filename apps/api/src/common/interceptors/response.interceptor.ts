import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { SKIP_RESPONSE_TRANSFORM } from '../decorators/skip-response-transform.decorator';
import { ApiResponse } from '../interfaces/api-response.interface';

interface RequestLike {
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
}

interface ResponseLike {
  statusCode?: number;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    const skip = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_TRANSFORM,
      [context.getHandler(), context.getClass()],
    );

    if (skip) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<RequestLike>();
    const response = http.getResponse<ResponseLike>();

    return next.handle().pipe(
      map((data) => this.toApiResponse(data, request, response)),
    );
  }

  private toApiResponse(
    data: T,
    request: RequestLike,
    response: ResponseLike,
  ): ApiResponse<T> {
    const statusCode = response.statusCode ?? 200;
    const requestIdHeader = request.headers?.['x-request-id'];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : requestIdHeader;

    return {
      success: statusCode < 400,
      statusCode,
      message: 'OK',
      data: data ?? null,
      timestamp: new Date().toISOString(),
      path: request.url ?? 'unknown',
      ...(requestId ? { requestId } : {}),
    };
  }
}
