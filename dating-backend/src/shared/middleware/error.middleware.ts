import { Prisma } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/app-error";

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "fail",
      message: err.message
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      status: "fail",
      message: "Validation error",
      errors: err.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        status: "fail",
        message: "Unique constraint failed"
      });
    }

    if (err.code === "P2025") {
      return res.status(404).json({
        status: "fail",
        message: "Record not found"
      });
    }
  }

  console.error(err);
  return res.status(500).json({
    status: "error",
    message: "Internal server error"
  });
};
