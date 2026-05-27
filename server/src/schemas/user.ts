import { z } from "zod";
import { userRoleSchema } from "./auth";

export const updateUserSchema = z
  .object({
    role: userRoleSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    preferredTheme: z.enum(["light", "dark"]).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: z.string().min(6).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  })
  .refine((data) => !data.newPassword || Boolean(data.currentPassword), {
    message: "Informe a senha atual para alterar a senha.",
    path: ["currentPassword"],
  });
