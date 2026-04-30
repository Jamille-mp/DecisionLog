import { z } from "zod";

const decisionStatusSchema = z.enum(["pending", "approved", "archived"]);

export const createDecisionSchema = z.object({
  title: z.string().min(1),
  context: z.string().min(1),
  decision: z.string().min(1),
  reason: z.string().min(1),
});

export const updateDecisionSchema = createDecisionSchema
  .extend({
    status: decisionStatusSchema.optional(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Informe ao menos um campo para atualizar.",
  });

export const listDecisionQuerySchema = z.object({
  status: z
    .preprocess((value) => (value === "" ? undefined : value), decisionStatusSchema)
    .optional(),
  search: z
    .preprocess((value) => (value === "" ? undefined : value), z.string().trim().min(1))
    .optional(),
});
