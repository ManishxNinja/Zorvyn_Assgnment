import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import {
  dashboardRangeQuerySchema,
  recentQuerySchema,
  trendsQuerySchema,
} from "../schemas/dashboard.js";
import * as dashboardService from "../services/dashboardService.js";
import { AppError } from "../utils/errors.js";

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

dashboardRouter.get(
  "/summary",
  validate({ query: dashboardRangeQuerySchema }),
  async (req, res, next) => {
    try {
      const user = req.user!;
      const q = req.query as unknown as { from?: Date; to?: Date };
      const summary = await dashboardService.getSummary(user, q.from, q.to);
      res.json(summary);
    } catch (e) {
      next(e);
    }
  },
);

dashboardRouter.get(
  "/by-category",
  validate({ query: dashboardRangeQuerySchema }),
  async (req, res, next) => {
    try {
      const user = req.user!;
      const q = req.query as unknown as { from?: Date; to?: Date };
      const rows = await dashboardService.getByCategory(user, q.from, q.to);
      res.json({ data: rows });
    } catch (e) {
      next(e);
    }
  },
);

dashboardRouter.get(
  "/trends",
  validate({ query: trendsQuerySchema }),
  async (req, res, next) => {
    try {
      const user = req.user!;
      const q = req.query as unknown as { granularity: "week" | "month"; from: Date; to: Date };
      if (q.from > q.to) {
        throw new AppError(400, "`from` must be before or equal to `to`", "BAD_REQUEST");
      }
      const rows = await dashboardService.getTrends(user, q.granularity, q.from, q.to);
      res.json({ granularity: q.granularity, data: rows });
    } catch (e) {
      next(e);
    }
  },
);

dashboardRouter.get(
  "/recent",
  validate({ query: recentQuerySchema }),
  async (req, res, next) => {
    try {
      const user = req.user!;
      const { limit } = req.query as unknown as { limit: number };
      const rows = await dashboardService.getRecent(user, limit);
      res.json({ data: rows });
    } catch (e) {
      next(e);
    }
  },
);
