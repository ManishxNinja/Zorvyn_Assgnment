import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../utils/errors.js";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message, code: err.code });
    return;
  }

  if (err instanceof ZodError) {
    const first = err.errors[0];
    res.status(400).json({
      error: first?.message ?? "Validation failed",
      code: "VALIDATION_ERROR",
      details: err.flatten(),
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(", ") ?? "field";
      res.status(409).json({ error: `Duplicate value for ${target}`, code: "CONFLICT" });
      return;
    }
    if (err.code === "P2025") {
      res.status(404).json({ error: "Record not found", code: "NOT_FOUND" });
      return;
    }
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error", code: "INTERNAL" });
}
