import type { FinancialRecord, User } from "@prisma/client";

export function canAccessRecordRow(user: User, record: FinancialRecord): boolean {
  if (user.role === "ADMIN") return true;
  if (user.role === "ANALYST") return record.userId === user.id;
  return false;
}

/** Dashboard aggregates: own data for VIEWER/ANALYST; org-wide for ADMIN */
export function dashboardUserFilter(user: User): { userId?: string } {
  if (user.role === "ADMIN") return {};
  return { userId: user.id };
}
