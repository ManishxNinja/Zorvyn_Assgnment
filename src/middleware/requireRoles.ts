import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { AppError } from "../utils/errors.js";

export function requireRoles(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      next(new AppError(401, "Unauthorized", "UNAUTHORIZED"));
      return;
    }
    if (!allowed.includes(user.role)) {
      next(new AppError(403, "Insufficient permissions", "FORBIDDEN"));
      return;
    }
    next();
  };
}
