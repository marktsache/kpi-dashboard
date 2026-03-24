import { z } from "zod";

export const kpiEntrySchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().min(1),
  costCenter: z.enum(["330", "350", "370"]),
  comment: z.string().max(500).optional().nullable(),
  kundenbesuche: z.number().int().min(0).default(0),
  telefonate: z.number().int().min(0).default(0),
  auftraegeAkquiriert: z.number().int().min(0).default(0),
  auftraegeAbgeschlossen: z.number().int().min(0).default(0),
  profile: z.number().int().min(0).default(0),
  vorstellungsgespraeche: z.number().int().min(0).default(0),
  deals: z.number().int().min(0).default(0),
  eintritte: z.number().int().min(0).default(0),
  austritte: z.number().int().min(0).default(0),
});

export const kpiEntryArraySchema = z.array(kpiEntrySchema);

export const employeeCreateSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich"),
  email: z.string().email().optional().nullable(),
  costCenter: z.enum(["330", "350", "370"]),
});

export const employeeUpdateSchema = employeeCreateSchema.partial().extend({
  active: z.boolean().optional(),
});
