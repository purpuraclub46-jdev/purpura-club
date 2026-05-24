import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export const ApiPaginatedQuery = (): MethodDecorator =>
  applyDecorators(
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      example: 1,
      description: 'Page number (1-based)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      example: 20,
      description: 'Items per page',
    }),
  );
