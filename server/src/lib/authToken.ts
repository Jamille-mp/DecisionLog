import jwt from "jsonwebtoken";

type TokenUser = {
  active: boolean;
  companyId: string;
  email: string;
  id: string;
  role: string;
};

export function signAppToken(user: TokenUser) {
  return jwt.sign(
    {
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      active: user.active,
    },
    process.env.JWT_SECRET || "dev-secret",
    {
      subject: user.id,
      expiresIn: "1d",
    },
  );
}
