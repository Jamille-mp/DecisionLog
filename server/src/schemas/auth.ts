import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "manager", "auditor"]);

export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres.")
  .regex(/[A-Za-zÀ-ÿ]/, "A senha deve conter pelo menos uma letra.")
  .regex(/\d/, "A senha deve conter pelo menos um número.")
  .regex(/[^A-Za-zÀ-ÿ0-9]/, "A senha deve conter pelo menos um caractere especial.")
  .refine((password) => !/(012|123|234|345|456|567|678|789|987|876|765|654|543|432|321|210)/.test(password), {
    message: "A senha não deve conter sequência numérica.",
  });

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: passwordSchema,
  role: userRoleSchema.optional().default("manager"),
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
});

export const registerCompanySchema = z.object({
  companyName: z.string().min(2),
  name: z.string().min(2),
  email: z.email(),
  password: passwordSchema,
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: passwordSchema,
});
