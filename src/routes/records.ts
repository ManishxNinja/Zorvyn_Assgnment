import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/requireRoles.js";
import { validate } from "../middleware/validate.js";
import {
  createRecordBodySchema,
  listRecordsQuerySchema,
  recordIdParamsSchema,
  updateRecordBodySchema,
} from "../schemas/records.js";
import { canAccessRecordRow } from "../services/policies.js";
import { AppError } from "../utils/errors.js";
import { decimalToString } from "../utils/decimal.js";

export const recordsRouter = Router();

recordsRouter.use(authenticate, requireRoles("ANALYST", "ADMIN"));

function serializeRecord(r: {
  id: string;
  userId: string;
  amount: Prisma.Decimal;
  type: import("@prisma/client").EntryType;
  category: string;
  entryDate: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    userId: r.userId,
    amount: decimalToString(r.amount),
    type: r.type,
    category: r.category,
    entryDate: r.entryDate.toISOString().slice(0, 10),
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

recordsRouter.post(
  "/",
  validate({ body: createRecordBodySchema }),
  async (req, res, next) => {
    try {
      const user = req.user!;
      const body = req.body as {
        amount: number;
        type: import("@prisma/client").EntryType;
        category: string;
        entryDate: Date;
        notes?: string | null;
        userId?: string;
      };
      let ownerId = user.id;
      if (body.userId) {
        if (user.role !== "ADMIN") {
          throw new AppError(403, "Cannot create records for another user", "FORBIDDEN");
        }
        ownerId = body.userId;
      }

      const record = await prisma.financialRecord.create({
        data: {
          userId: ownerId,
          amount: new Prisma.Decimal(body.amount),
          type: body.type,
          category: body.category,
          entryDate: body.entryDate,
          notes: body.notes ?? null,
        },
      });
      res.status(201).json(serializeRecord(record));
    } catch (e) {
      next(e);
    }
  },
);

recordsRouter.get(
  "/",
  validate({ query: listRecordsQuerySchema }),
  async (req, res, next) => {
    try {
      const user = req.user!;
      const q = req.query as unknown as {
        fromDate?: Date;
        toDate?: Date;
        category?: string;
        type?: import("@prisma/client").EntryType;
        userId?: string;
        skip: number;
        take: number;
      };

      if (q.userId && user.role !== "ADMIN") {
        throw new AppError(403, "Only admins may filter by userId", "FORBIDDEN");
      }

      const where: Prisma.FinancialRecordWhereInput = {};
      if (user.role === "ADMIN") {
        if (q.userId) where.userId = q.userId;
      } else {
        where.userId = user.id;
      }

      if (q.fromDate || q.toDate) {
        where.entryDate = {
          ...(q.fromDate ? { gte: q.fromDate } : {}),
          ...(q.toDate ? { lte: q.toDate } : {}),
        };
      }
      if (q.category) where.category = q.category;
      if (q.type) where.type = q.type;

      const [items, total] = await Promise.all([
        prisma.financialRecord.findMany({
          where,
          orderBy: { entryDate: "desc" },
          skip: q.skip,
          take: q.take,
        }),
        prisma.financialRecord.count({ where }),
      ]);

      res.json({
        data: items.map(serializeRecord),
        total,
        skip: q.skip,
        take: q.take,
      });
    } catch (e) {
      next(e);
    }
  },
);

recordsRouter.get(
  "/:id",
  validate({ params: recordIdParamsSchema }),
  async (req, res, next) => {
    try {
      const user = req.user!;
      const { id } = req.params as { id: string };
      const record = await prisma.financialRecord.findUnique({ where: { id } });
      if (!record) {
        throw new AppError(404, "Record not found", "NOT_FOUND");
      }
      if (!canAccessRecordRow(user, record)) {
        throw new AppError(403, "Forbidden", "FORBIDDEN");
      }
      res.json(serializeRecord(record));
    } catch (e) {
      next(e);
    }
  },
);

recordsRouter.patch(
  "/:id",
  validate({ params: recordIdParamsSchema, body: updateRecordBodySchema }),
  async (req, res, next) => {
    try {
      const user = req.user!;
      const { id } = req.params as { id: string };
      const existing = await prisma.financialRecord.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(404, "Record not found", "NOT_FOUND");
      }
      if (!canAccessRecordRow(user, existing)) {
        throw new AppError(403, "Forbidden", "FORBIDDEN");
      }

      const body = req.body as {
        amount?: number;
        type?: import("@prisma/client").EntryType;
        category?: string;
        entryDate?: Date;
        notes?: string | null;
      };
      const data: Prisma.FinancialRecordUpdateInput = {};
      if (body.amount !== undefined) data.amount = new Prisma.Decimal(body.amount);
      if (body.type !== undefined) data.type = body.type;
      if (body.category !== undefined) data.category = body.category;
      if (body.entryDate !== undefined) data.entryDate = body.entryDate;
      if (body.notes !== undefined) data.notes = body.notes;

      const record = await prisma.financialRecord.update({
        where: { id },
        data,
      });
      res.json(serializeRecord(record));
    } catch (e) {
      next(e);
    }
  },
);

recordsRouter.delete(
  "/:id",
  validate({ params: recordIdParamsSchema }),
  async (req, res, next) => {
    try {
      const user = req.user!;
      const { id } = req.params as { id: string };
      const existing = await prisma.financialRecord.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(404, "Record not found", "NOT_FOUND");
      }
      if (!canAccessRecordRow(user, existing)) {
        throw new AppError(403, "Forbidden", "FORBIDDEN");
      }
      await prisma.financialRecord.delete({ where: { id } });
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
);
