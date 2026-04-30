import { NextFunction, Request, Response } from "express";

type AsyncRoute = (
  request: Request,
  response: Response,
  next: NextFunction,
) => Promise<void>;

export function asyncHandler(route: AsyncRoute) {
  return (request: Request, response: Response, next: NextFunction) => {
    route(request, response, next).catch(next);
  };
}
