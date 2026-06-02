declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      companyId: string;
      email: string;
      role: "admin" | "manager" | "auditor";
    };
  }
}
