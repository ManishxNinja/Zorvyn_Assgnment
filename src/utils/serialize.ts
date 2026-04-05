import type { User } from "@prisma/client";

export function publicUser(user: User) {
  const { passwordHash: _p, ...rest } = user;
  return rest;
}
