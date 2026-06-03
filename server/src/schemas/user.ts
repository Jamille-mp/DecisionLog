import { z } from "zod";
import { passwordSchema, userRoleSchema } from "./auth";

const imageDataUrlSchema = z
  .string()
  .max(700_000, "A imagem deve ter no mÃ¡ximo 512 KB.")
  .regex(
    /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/,
    "Envie uma imagem PNG, JPG ou WebP vÃ¡lida.",
  );

const optionalImageDataUrlSchema = z.union([imageDataUrlSchema, z.null()]).optional();

export const updateUserSchema = z
  .object({
    role: userRoleSchema.optional(),
    active: z.boolean().optional(),
    departmentId: z.string().uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const updateProfileSchema = z
  .object({
    name: z.string().min(2).optional(),
    email: z.email().optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    avatarUrl: optionalImageDataUrlSchema,
    companyLogoUrl: optionalImageDataUrlSchema,
    preferredTheme: z.enum(["light", "dark"]).optional(),
    currentPassword: z.string().min(1).optional(),
    newPassword: passwordSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  })
  .refine((data) => !data.newPassword || Boolean(data.currentPassword), {
    message: "Informe a senha atual para alterar a senha.",
    path: ["currentPassword"],
  });
