import { z } from "zod";

export const kpiEntrySchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  costCenter: z.enum(["330", "350", "370"]),
  comment: z.string().max(500).optional().nullable(),
  profile: z.number().int().min(0).nullable().optional(),
  vorstellungsgespraeche: z.number().int().min(0).nullable().optional(),
  deals: z.number().int().min(0).nullable().optional(),
  eintritte: z.number().int().min(0).nullable().optional(),
  austritte: z.number().int().min(0).nullable().optional(),
});

export const kpiEntryArraySchema = z.array(kpiEntrySchema);

export const employeeCreateSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  costCenter: z.enum(["330", "350", "370"]),
  jobTitle: z.string().optional(),
  startDate: z.string().nullable().optional(),
});

export const employeeUpdateSchema = employeeCreateSchema.partial().extend({
  active: z.boolean().optional(),
  photoUrl: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  startDate: z.string().nullable().optional(),
});

// ── User Schemas ──
export const userCreateSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  email: z.string().email("Ungültige E-Mail-Adresse"),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen lang sein"),
  role: z.string().default("admin"),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  role: z.string().optional(),
  photoUrl: z.string().nullable().optional(),
});
