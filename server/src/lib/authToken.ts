import jwt from "jsonwebtoken";
import { getJwtSecret } from "./secrets";

type TokenUser = {
  active: boolean;
  companyId: string;
  email: string;
  id: string;
  role: string;
};

export function signAppToken(user: TokenUser) {
  const expiresIn = (process.env.JWT_EXPIRES_IN ||
    "8h") as jwt.SignOptions["expiresIn"];

  return jwt.sign(
    {
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      active: user.active,
    },
    getJwtSecret(),
    {
      subject: user.id,
      expiresIn,
    },
  );
}
