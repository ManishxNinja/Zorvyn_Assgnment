import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";
type JwtPayload = {
  sub: string;
};

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(401, "Missing or invalid Authorization header", "UNAUTHORIZED");
    }
    const token = header.slice(7);
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      throw new AppError(401, "User no longer exists", "UNAUTHORIZED");
    }
    if (user.status !== "ACTIVE") {
      throw new AppError(403, "Account is inactive", "FORBIDDEN");
    }
    req.user = user;
    next();
  } catch (e) {
    if (e instanceof AppError) {
      next(e);
      return;
    }
    if (e instanceof jwt.JsonWebTokenError || e instanceof jwt.TokenExpiredError) {
      next(new AppError(401, "Invalid or expired token", "UNAUTHORIZED"));
      return;
    }
    next(e);
  }
}
