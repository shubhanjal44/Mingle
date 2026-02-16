import { UserRole } from "@prisma/client";
import { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../../config/prisma";
import { AppError } from "../errors/app-error";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
}

type JwtPayload = {
  userId: string;
  iat: number;
  exp: number;
};

export const authMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization;
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new AppError(500, "JWT secret is not configured");
    }

    if (!header || !header.startsWith("Bearer ")) {
      throw new AppError(401, "Unauthorized");
    }

    const token = header.split(" ")[1];
    if (!token) {
      throw new AppError(401, "Unauthorized");
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true
      }
    });

    if (!user) {
      throw new AppError(401, "Unauthorized");
    }

    (req as AuthRequest).user = user;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({
        status: "fail",
        message: error.message
      });
    }

    return res.status(401).json({
      status: "fail",
      message: "Invalid token"
    });
  }
};
