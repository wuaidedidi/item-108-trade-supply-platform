import { z } from 'zod';

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive('ID不正确')
});

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  keyword: z.string().trim().optional().default(''),
  status: z.string().trim().optional().default(''),
  category: z.string().trim().optional().default('')
});

export const optionalEmail = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => value || null)
  .refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), '邮箱格式不正确');

export const optionalPhone = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => value || null)
  .refine((value) => !value || /^1[3-9]\d{9}$/.test(value), '手机号格式不正确');

export function validate(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const first = result.error.issues[0];
    const error = new Error(first?.message || '参数不正确');
    error.statusCode = 400;
    throw error;
  }
  return result.data;
}
