type UserWithCompany = {
  company?: ({ accessCode?: string | null } & Record<string, unknown>) | null;
  role: string;
};

export function exposeCompanyAccessCodeForAdmin<T extends UserWithCompany>(user: T): T {
  if (user.role === "admin" || !user.company) {
    return user;
  }

  const { accessCode: _accessCode, ...company } = user.company;

  return {
    ...user,
    company,
  } as T;
}
