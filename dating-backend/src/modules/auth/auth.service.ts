import { SubscriptionTier, User } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { AppError } from "../../shared/errors/app-error";
import { loginSchema, registerSchema } from "./auth.validation";

type RegisterInput = z.infer<typeof registerSchema>;
type LoginInput = z.infer<typeof loginSchema>;

type SafeUser = Omit<User, "password">;

export class AuthService {
  private static signToken(userId: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError(500, "JWT secret is not configured");
    }

    return jwt.sign({ userId }, secret, { expiresIn: "7d" });
  }

  private static sanitizeUser(user: User): SafeUser {
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  static async register(data: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new AppError(409, "Email already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        subscription: {
          create: {
            tier: SubscriptionTier.FREE
          }
        }
      }
    });

    const token = this.signToken(user.id);
    return {
      token,
      user: this.sanitizeUser(user)
    };
  }

  static async login(data: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw new AppError(401, "Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new AppError(401, "Invalid credentials");
    }

    const token = this.signToken(user.id);
    return {
      token,
      user: this.sanitizeUser(user)
    };
  }
}
