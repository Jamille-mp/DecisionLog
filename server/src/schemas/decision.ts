import { z } from "zod";

export const createDecisionSchema = z.object({
  title: z.string().min(1),
  context: z.string().min(1),
  decision: z.string().min(1),
  reason: z.string().min(1),
});

export const updateDecisionSchema = createDecisionSchema
  .extend({
    status: z.enum(["pending", "approved", "archived"]).optional(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });
