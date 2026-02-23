import { z } from "zod";

import { MAX_LOTS, MAX_MONEY_VALUE } from "@/lib/constants";

export const USERNAME_REGEX = /^[A-Za-z0-9_]{1,20}$/;

const usernameSchema = z
  .string()
  .trim()
  .min(1, "Username wajib diisi")
  .max(20, "Maksimal 20 karakter")
  .regex(USERNAME_REGEX, "Username hanya boleh huruf, angka, underscore (_)");

const oversizedMessage = "Nilai terlalu besar";

export const entryInputSchema = z.object({
  username: usernameSchema,
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
  totalNominal: z.coerce
    .number({ invalid_type_error: "Total nominal harus angka" })
    .finite("Total nominal harus angka")
    .min(0, "Total nominal minimal 0")
    .max(MAX_MONEY_VALUE, oversizedMessage)
});

export type EntryInput = z.infer<typeof entryInputSchema>;

export function normalizeUsername(username: string) {
  const usernameDisplay = username.trim();

  return {
    usernameDisplay,
    usernameKey: usernameDisplay.toLowerCase()
  };
}
