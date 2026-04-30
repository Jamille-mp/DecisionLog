import { z } from "zod";

export const createDecisionSchema = z.object({
  title: z.string().min(1),
  context: z.string().min(1),
  decision: z.string().min(1),
  reason: z.string().min(1),
});
