import { z } from "zod";

const decisionStatusSchema = z.enum(["pending", "approved", "archived", "inactive"]);
const decisionImpactSchema = z.enum(["low", "medium", "high"]);

export const createDecisionSchema = z.object({
  title: z.string().min(1),
  context: z.string().min(1),
  decision: z.string().min(1),
  reason: z.string().min(1),
  department: z.string().min(1),
  departmentId: z.string().uuid(),
  impact: decisionImpactSchema,
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
  includeInactive: z
    .preprocess((value) => value === "true", z.boolean())
    .optional(),
  search: z
    .preprocess((value) => (value === "" ? undefined : value), z.string().trim().min(1))
    .optional(),
});
