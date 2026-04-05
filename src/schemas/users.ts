import { z } from "zod";
import { Role, UserStatus } from "@prisma/client";

const roleEnum = z.nativeEnum(Role);
const statusEnum = z.nativeEnum(UserStatus);

export const createUserBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleEnum.default("VIEWER"),
  status: statusEnum.default("ACTIVE"),
});

export const updateUserBodySchema = z
  .object({
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    role: roleEnum.optional(),
    status: statusEnum.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field required" });

export const userIdParamsSchema = z.object({
  id: z.string().uuid(),
});
