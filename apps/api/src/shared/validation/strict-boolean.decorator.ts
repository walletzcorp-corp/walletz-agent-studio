import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

/**
 * A real JSON boolean, nothing else. The global ValidationPipe uses implicit conversion, which
 * turns ANY non-empty string (including "false") into `true`; for flags that grant access
 * (approve a command, allow a tool, assert consent) that coercion is a security bug.
 */
export const StrictBoolean = () =>
  applyDecorators(
    Transform(({ obj, key }: { obj: Record<string, unknown>; key: string }) => obj[key], {
      toClassOnly: true,
    }),
    IsBoolean(),
  );
