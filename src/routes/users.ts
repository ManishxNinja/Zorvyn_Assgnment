import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { requireRoles } from "../middleware/requireRoles.js";
import { validate } from "../middleware/validate.js";
import {
  createUserBodySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from "../schemas/users.js";
import { paginationQuerySchema } from "../schemas/pagination.js";
import { publicUser } from "../utils/serialize.js";
import { AppError } from "../utils/errors.js";

export const usersRouter = Router();

usersRouter.use(authenticate, requireRoles("ADMIN"));

usersRouter.post(
  "/",
  validate({ body: createUserBodySchema }),
  async (req, res, next) => {
    try {
      const body = req.body as {
        email: string;
        password: string;
        role: import("@prisma/client").Role;
        status: import("@prisma/client").UserStatus;
      };
      const passwordHash = await bcrypt.hash(body.password, 12);
      const user = await prisma.user.create({
        data: {
          email: body.email.toLowerCase(),
          passwordHash,
          role: body.role,
          status: body.status,
        },
      });
      res.status(201).json(publicUser(user));
    } catch (e) {
      next(e);
    }
  },
);

usersRouter.get(
  "/",
  validate({ query: paginationQuerySchema }),
  async (req, res, next) => {
    try {
      const { skip, take } = req.query as unknown as { skip: number; take: number };
      const [items, total] = await Promise.all([
        prisma.user.findMany({
          orderBy: { createdAt: "desc" },
          skip,
          take,
        }),
        prisma.user.count(),
      ]);
      res.json({
        data: items.map(publicUser),
        total,
        skip,
        take,
      });
    } catch (e) {
      next(e);
    }
  },
);

usersRouter.get(
  "/:id",
  validate({ params: userIdParamsSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new AppError(404, "User not found", "NOT_FOUND");
      }
      res.json(publicUser(user));
    } catch (e) {
      next(e);
    }
  },
);

usersRouter.patch(
  "/:id",
  validate({ params: userIdParamsSchema, body: updateUserBodySchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      const body = req.body as {
        email?: string;
        password?: string;
        role?: import("@prisma/client").Role;
        status?: import("@prisma/client").UserStatus;
      };
      const data: {
        email?: string;
        passwordHash?: string;
        role?: import("@prisma/client").Role;
        status?: import("@prisma/client").UserStatus;
      } = {};
      if (body.email !== undefined) data.email = body.email.toLowerCase();
      if (body.password !== undefined) data.passwordHash = await bcrypt.hash(body.password, 12);
      if (body.role !== undefined) data.role = body.role;
      if (body.status !== undefined) data.status = body.status;

      const user = await prisma.user.update({
        where: { id },
        data,
      });
      res.json(publicUser(user));
    } catch (e) {
      next(e);
    }
  },
);

/** Soft-delete: sets status to INACTIVE */
usersRouter.delete(
  "/:id",
  validate({ params: userIdParamsSchema }),
  async (req, res, next) => {
    try {
      const { id } = req.params as { id: string };
      if (id === req.user?.id) {
        throw new AppError(400, "Cannot deactivate your own account this way", "BAD_REQUEST");
      }
      const user = await prisma.user.update({
        where: { id },
        data: { status: "INACTIVE" },
      });
      res.json({ ok: true, user: publicUser(user) });
    } catch (e) {
      next(e);
    }
  },
);
