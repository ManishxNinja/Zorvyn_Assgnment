import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { signAccessToken } from "../services/authTokens.js";
import { validate } from "../middleware/validate.js";
import { loginBodySchema } from "../schemas/auth.js";
import { AppError } from "../utils/errors.js";

export const authRouter = Router();

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
