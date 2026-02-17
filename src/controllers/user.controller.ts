import { type Request, type Response } from "express";
import { findUserById } from "../services/user.service";

export const verifyUser = async (req: Request, res: Response) => {
  try {
    const userRequest = req.user;

    if (!userRequest) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await findUserById(userRequest.id);

    if (!user.is_verified) {
      return res.status(400).json({
        message: "User not verified",
        data: { otp: false },
      });
    }

    return res.status(200).json({
      message: "User verified",
      data: user,
    });
  } catch (error: any) {
    return res.status(404).json({
      message: error.message,
    });
  }
};
