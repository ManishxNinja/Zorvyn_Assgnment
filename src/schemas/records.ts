import { z } from "zod";
import { EntryType } from "@prisma/client";

const entryTypeEnum = z.nativeEnum(EntryType);

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .transform((s) => new Date(s + "T00:00:00.000Z"));

export const createRecordBodySchema = z.object({
  amount: z.coerce.number().positive("Amount must be positive"),
  type: entryTypeEnum,
  category: z.string().min(1).max(120),
  entryDate: dateString,
  notes: z.string().max(2000).optional().nullable(),
  /** Admin only: assign record to another user */
  userId: z.string().uuid().optional(),
});

export const updateRecordBodySchema = z
  .object({
    amount: z.coerce.number().positive().optional(),
    type: entryTypeEnum.optional(),
    category: z.string().min(1).max(120).optional(),
    entryDate: dateString.optional(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field required" });

export const recordIdParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listRecordsQuerySchema = z.object({
  fromDate: dateString.optional(),
  toDate: dateString.optional(),
  category: z.string().optional(),
  type: entryTypeEnum.optional(),
  userId: z.string().uuid().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(20),
});
