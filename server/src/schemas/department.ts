import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2),
});

export const updateDepartmentSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    active: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });
