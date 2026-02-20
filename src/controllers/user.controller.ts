import { type Request, type Response, type NextFunction } from "express";
import {
  changeProfileOrPassword,
  findUserById,
  getProfile,
} from "../services/user.service";
import { UserError } from "../middlewares/errorHandler";
import { getPayloadJWT } from "../services/auth.service";
import { createAccessToken, createRefreshToken } from "../utils/auth-token";

export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
    next();
  } catch (error) {
    next(error);
  }
};

export const handleMe = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { accessToken, refreshToken, status, user } = req;

    if (!user) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Data user not found ",
      });
    }

    if (!user.id) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Data user not found ",
      });
    }

    const dataUserDB = await findUserById(user.id);
    const profile = await getProfile(dataUserDB.id);

    if (status === "refresh")
      res.cookie("refresh-token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: (process.env.SAMESITE as "none" | "lax" | "strict") || "none",
        maxAge: 1000 * 60 * 60 * 168,
        path: "/",
      });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Get profile success",
      data: {
        id: dataUserDB.id,
        full_name: profile.full_name,
        email: dataUserDB?.email,
        avatar: profile.avatar,
      },
      tokens: status === "refresh" ? { accessToken } : undefined,
    });
  } catch (error) {
    console.info(error);
    next(
      new UserError({
        message: error instanceof Error ? error.message : "Error get user",
        statusCode: 400,
      }),
    );
  }
};

export const handleChangeProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { user } = req;
    const { fieldUser, value } = req.body;

    if (!user) {
      return {
        status: "error",
        code: 404,
        message: "Data user not found ",
        data: null,
      };
    }

    if (!user.id) {
      return {
        status: "error",
        code: 404,
        message: "Data user not found ",
        data: null,
      };
    }

    const changePassword = fieldUser === "password" ? true : false;

    const { status, code, message, data } = await changeProfileOrPassword(
      user,
      fieldUser,
      value,
      changePassword,
    );

    if (status === "error")
      return res.status(code).json({
        status: status,
        code: code,
        message: message,
        data: null,
      });

    if (!data)
      return res.json({
        status: "error",
        code: 404,
        message: message,
        data: null,
      });

    const payloadJWT = await getPayloadJWT(data.user);

    const accessToken = createAccessToken({ payload: payloadJWT });
    const refreshToken = createRefreshToken({ payload: payloadJWT });

    res.cookie("refresh-token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.SAMESITE as "none" | "lax" | "strict") || "none",
      maxAge: 1000 * 60 * 60 * 168,
      path: "/",
    });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Change profile success",
      data: {
        id: data.user.id,
        full_name: data.profile.full_name,
        email: data.user.email,
        avatar: data.profile.avatar,
      },
      tokens: {
        accessToken,
      },
    });
  } catch (error) {
    console.info(error);
    next(
      new UserError({
        message:
          error instanceof Error ? error.message : "Error verify register",
        statusCode: 400,
      }),
    );
  }
};
