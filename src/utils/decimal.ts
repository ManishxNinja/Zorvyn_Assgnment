import type { Decimal } from "@prisma/client/runtime/library";

export function decimalToString(d: Decimal): string {
  return d.toFixed(2);
}
