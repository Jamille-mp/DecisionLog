type DecisionState = Record<string, unknown>;

const auditableFields = [
  "title",
  "context",
  "decision",
  "reason",
  "department",
  "departmentId",
  "impact",
  "status",
  "active",
] as const;

export function getDecisionChangedFields(
  previousState: DecisionState,
  nextState: DecisionState,
) {
  return auditableFields.filter(
    (field) => previousState[field] !== nextState[field],
  );
}

export function getDecisionAuditAction(
  previousStatus?: unknown,
  nextStatus?: unknown,
) {
  if (previousStatus !== "archived" && nextStatus === "archived") {
    return "DECISION_ARCHIVED";
  }

  if (previousStatus === "archived" && nextStatus !== "archived") {
    return "DECISION_UNARCHIVED";
  }

  return "DECISION_UPDATED";
}

export function getDecisionEventName(auditAction: string) {
  if (auditAction === "DECISION_ARCHIVED") return "decision.archived";
  if (auditAction === "DECISION_UNARCHIVED") return "decision.unarchived";
  return "decision.updated";
}
