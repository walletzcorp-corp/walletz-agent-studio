import { BadRequestException } from '@nestjs/common';

export interface Paging {
  limit: number;
  offset: number;
}

/** Validated pagination: no NaN, no negative offsets, bounded page size. */
export function parsePaging(
  limit: unknown,
  offset: unknown,
  options: { defaultLimit?: number; maxLimit?: number } = {},
): Paging {
  const { defaultLimit = 50, maxLimit = 200 } = options;

  const parse = (value: unknown, fallback: number, name: string): number => {
    if (value === undefined || value === null || value === '') return fallback;
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0)
      throw new BadRequestException(`${name} must be a non-negative integer`);
    return n;
  };

  const parsedLimit = parse(limit, defaultLimit, 'limit');
  if (parsedLimit < 1 || parsedLimit > maxLimit) {
    throw new BadRequestException(`limit must be between 1 and ${maxLimit}`);
  }
  return { limit: parsedLimit, offset: parse(offset, 0, 'offset') };
}
