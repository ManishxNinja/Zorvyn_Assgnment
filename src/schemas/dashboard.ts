import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .transform((s) => new Date(s + "T00:00:00.000Z"));

export const dashboardRangeQuerySchema = z.object({
  from: dateString.optional(),
  to: dateString.optional(),
});

export const trendsQuerySchema = z.object({
  granularity: z.enum(["week", "month"]),
  from: dateString,
  to: dateString,
});

export const recentQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
