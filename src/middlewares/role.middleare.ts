import { Request, Response, NextFunction } from "express";
import { getUserRoleById } from "../services/user.service";

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized",
      });
    }

    const role = await getUserRoleById(parseInt(userId));

    if (role !== "admin") {
      return res.status(403).json({
        status: "error",
        message: "Forbidden: Admin only",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
