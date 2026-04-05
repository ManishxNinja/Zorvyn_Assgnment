import { z } from "zod";

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

/** Public sign-up: new accounts get role VIEWER (admins promote via /users). */
export const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
