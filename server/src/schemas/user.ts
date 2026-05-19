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
