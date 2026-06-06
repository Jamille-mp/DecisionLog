export function canManageDecision(
  role: string | undefined,
  currentUserDepartmentId?: string | null,
  decisionDepartmentId?: string | null,
) {
  if (role === "admin") {
    return true;
  }

  return (
    role === "manager" &&
    Boolean(currentUserDepartmentId && currentUserDepartmentId === decisionDepartmentId)
  );
}
