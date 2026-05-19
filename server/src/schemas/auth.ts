import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "manager", "auditor"]);

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(6),
  role: userRoleSchema.optional().default("manager"),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
