import { z } from "zod";

import { MAX_LOTS, MAX_MONEY_VALUE, MAX_USERNAME_LENGTH } from "@/lib/constants";

export const USERNAME_REGEX = new RegExp(`^[A-Za-z0-9_]{1,${MAX_USERNAME_LENGTH}}$`);

const usernameSchema = z
  .string()
  .trim()
  .min(1, "Username wajib diisi")
  .max(MAX_USERNAME_LENGTH, `Maksimal ${MAX_USERNAME_LENGTH} karakter`)
  .regex(USERNAME_REGEX, "Username hanya boleh huruf, angka, underscore (_)");

const oversizedMessage = "Nilai terlalu besar";

export const entryInputSchema = z.object({
  username: usernameSchema,
  blur: z.coerce.boolean().optional().default(false),
  lots: z.coerce
    .number({ invalid_type_error: "Lots harus angka" })
    .finite("Lots harus angka")
    .int("Lots harus bilangan bulat")
    .min(1, "Lots minimal 1")
    .max(MAX_LOTS, oversizedMessage),
  avgPrice: z.coerce
    .number({ invalid_type_error: "Average harus angka" })
    .finite("Average harus angka")
    .min(0, "Average minimal 0")
    .max(MAX_MONEY_VALUE, oversizedMessage),
}).superRefine((value, ctx) => {
  const computedTotalNominal = value.lots * 100 * value.avgPrice;

  if (!Number.isFinite(computedTotalNominal) || computedTotalNominal > MAX_MONEY_VALUE) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["avgPrice"],
      message: oversizedMessage
    });
  }
});

export type EntryInput = z.infer<typeof entryInputSchema>;

export function normalizeUsername(username: string) {
  const usernameDisplay = username.trim();

  return {
    usernameDisplay,
    usernameKey: usernameDisplay.toLowerCase()
  };
}
