import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { signAccessToken } from "../services/authTokens.js";
import { validate } from "../middleware/validate.js";
import { loginBodySchema, registerBodySchema } from "../schemas/auth.js";
import { AppError } from "../utils/errors.js";
import { Role, UserStatus } from "@prisma/client";
import { publicUser } from "../utils/serialize.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  validate({ body: registerBodySchema }),
  async (req, res, next) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const normalized = email.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email: normalized } });
      if (existing) {
        throw new AppError(409, "An account with this email already exists", "CONFLICT");
      }
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          email: normalized,
          passwordHash,
          role: Role.VIEWER,
          status: UserStatus.ACTIVE,
        },
      });
      const token = signAccessToken(user.id);
      res.status(201).json({
        accessToken: token,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
        user: publicUser(user),
      });
    } catch (e) {
      next(e);
    }
  },
);

authRouter.post(
  "/login",
  validate({ body: loginBodySchema }),
  async (req, res, next) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!user) {
        throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
      }
      if (user.status !== "ACTIVE") {
        throw new AppError(403, "Account is inactive", "FORBIDDEN");
      }
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
      }
      const token = signAccessToken(user.id);
      res.json({
        accessToken: token,
        tokenType: "Bearer",
        expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
        user: { id: user.id, email: user.email, role: user.role, status: user.status },
      });
    } catch (e) {
      next(e);
    }
  },
);
