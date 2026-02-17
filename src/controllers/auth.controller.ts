import { NextFunction, Request, Response } from "express";
import {
  authenticateGoogleUser,
  getGoogleUserFromCode,
  getPayloadJWT,
  setPassword,
  validateDataLogin,
  validateDataRegister,
  validateDataUserSetPassword,
  verifyOTPUser,
} from "../services/auth.service";

import { JWTPayload, Profile, User } from "../types/auth-types";
import { createAccessToken, createRefreshToken } from "../utils/auth-token";
import { AuthError } from "../middlewares/errorHandler";
import { pool } from "../database/db";
import {
  findUserByEmail,
  findUserById,
  getProfile,
} from "../services/user.service";
import {
  addUserAccountGoogle,
  addUserAccountVerified,
} from "../services/auth.service";
import { requestOTP } from "../utils/otp";

export const handleGoogleCallback = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { code, state } = req.query;

    if (typeof code !== "string") throw new Error("Invalid code google");

    const googleData = await getGoogleUserFromCode(code);

    const { status, data: authData } = await authenticateGoogleUser({
      email: googleData.email,
      name: googleData.name,
    });

    if (status === "failed" || !authData) {
      return res.redirect(
        `${process.env.REDIRECT_LOGIN_GOOGLE}/${state}/?status=failed`,
      );
    }

    if (status === "register") {
      return res.redirect(
        `${process.env.REDIRECT_LOGIN_GOOGLE}/set-password?status=register&email=${encodeURIComponent(
          (authData as { email: string; full_name: string }).email,
        )}&full_name=${encodeURIComponent(
          (authData as { email: string; full_name: string }).full_name,
        )}`,
      );
    }

    const { user, profile } = authData as { user: User; profile: Profile };

    const payloadJWT: JWTPayload = {
      id: user.id,
      avatar: profile.avatar,
      email: user.email,
      full_name: profile.full_name,
      role: user.role,
    };

    const refreshToken = createRefreshToken({ payload: payloadJWT });

    res.cookie("refresh-token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.SAMESITE as "none" | "lax" | "strict") || "none",
      maxAge: 1000 * 60 * 60 * 168,
      path: "/",
    });

    // res.redirect(`${process.env.REDIRECT_LOGIN_GOOGLE}/dashboard`);
  } catch (error) {
    next(
      new AuthError({
        message:
          error instanceof Error
            ? `Error callback google: ${error.message}`
            : "Error callback google",
        statusCode: 500,
      }),
    );
  }
};

export const handleSetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { dataUser } = req.body;

    const dataUserRegister = validateDataUserSetPassword(dataUser);

    if (dataUserRegister.status === "error")
      return res.status(dataUserRegister.code).json({
        status: "error",
        code: dataUserRegister.code,
        message: dataUserRegister.message,
      });

    const dataUserDB = await pool.query<User>(
      "SELECT * FROM  auth.users where email=$1",
      [dataUser.user.email],
    );

    // if email is already
    if (dataUserDB)
      return res.status(409).json({
        status: "error",
        code: 409,
        message: "User is already exists",
      });

    const { user, profile } = await addUserAccountGoogle(
      dataUser.password,
      dataUser.email,
      dataUser.full_name,
    );

    const payloadJWT = getPayloadJWT(user);

    const accessToken = createAccessToken({ payload: payloadJWT });
    const refreshToken = createRefreshToken({ payload: payloadJWT });

    res.cookie("refresh-token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.SAMESITE as "none" | "lax" | "strict") || "none",
      maxAge: 1000 * 60 * 60 * 168,
      path: "/",
    });

    res.status(201).json({
      status: "success",
      code: 201,
      message: "Register google success",
      data: {
        id: user.id,
        full_name: profile.full_name,
        email: user.email,
        avatar: profile.avatar,
      },
      tokens: {
        accessToken,
      },
    });
  } catch (error) {
    console.info(error);
    next(
      new AuthError({
        message: error instanceof Error ? error.message : "Error set password",
        statusCode: 400,
      }),
    );
  }
};

export const handleRegister = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { dataUser } = req.body;

    const dataUserRegister = validateDataRegister(dataUser);

    if (dataUserRegister.status === "error")
      return res.status(dataUserRegister.code).json({
        status: "error",
        code: dataUserRegister.code,
        message: dataUserRegister.message,
      });

    // account is arlready and verified
    const userIsVerified = (
      await pool.query<User>(
        "select * from auth.users where email=$1 and is_verified=$2",
        [dataUser.email, true],
      )
    ).rows[0];

    if (userIsVerified) {
      return res.status(409).json({
        status: "error",
        code: 409,
        message: "Email already exists",
      });
    }

    // account is already but not verified
    const userNotVerified = (
      await pool.query<User>(
        "select * from auth.users where email=$1 and is_verified=$2",
        [dataUser.email, false],
      )
    ).rows[0];

    if (userNotVerified) {
      return res.status(200).json({
        status: "pending",
        code: 200,
        message: "Account exists but not verified. Please verify your email.",
        data: {
          id: userNotVerified.id,
          full_name: dataUser.full_name,
          email: userNotVerified.email,
        },
      });
    }

    const { user, profile } = await addUserAccountVerified(dataUser);

    if (!user) {
      throw new Error("Failed to create verification account");
    }

    res.status(201).json({
      status: "pending",
      code: 200,
      message:
        "Your account has been successfully created.Please verify the email to continue.",
      data: {
        id: user.id,
        full_name: profile.full_name,
        email: user.email,
      },
    });
  } catch (error) {
    console.info(error);
    next(
      new AuthError({
        message: error instanceof Error ? error.message : "Error register",
        statusCode: 400,
      }),
    );
  }
};

export const handleRequestOTPRegister = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { dataUser } = req.body;

    if (!dataUser.id || !dataUser.full_name || !dataUser.email) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Data request otp not found",
      });
    }

    const user = await findUserById(dataUser.id);

    const { statusOTP, message } = await requestOTP({
      userId: user.id,
      secret: user.secret,
      email: user.email,
    });

    if (statusOTP === "false") {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: message,
      });
    }

    res.status(202).json({
      status: "success",
      code: 202,
      message: statusOTP,
      data: {
        otp: true,
      },
    });
  } catch (error) {
    console.info(error);
    next(
      new AuthError({
        message:
          error instanceof Error ? error.message : "Error request otp register",
        statusCode: 400,
      }),
    );
  }
};

export const handleVerifyOTPRegister = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { dataUser } = req.body;

    const { status, code, message, data } = await verifyOTPUser({
      id: dataUser.id,
      email: dataUser.email,
      full_name: dataUser.full_name,
      token: dataUser.token,
    });

    if (status === "error")
      return res.status(code).json({
        status: status,
        code: code,
        message: message,
      });

    if (!data) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Data login not found ",
      });
    }

    if (!data.user || !data.profile) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Data user not found ",
      });
    }

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

    res.status(202).json({
      status: "success",
      code: 202,
      message: "OTP register success",
      data: {
        otp: true,
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
      new AuthError({
        message:
          error instanceof Error ? error.message : "Error verify register",
        statusCode: 400,
      }),
    );
  }
};

export const handleLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { dataUser } = req.body;

    const { status, code, message, data } = await validateDataLogin({
      email: dataUser.email,
      password: dataUser.password,
    });

    if (status === "error")
      return res.status(code).json({
        status: status,
        code: code,
        message: message,
      });

    if (!data) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Data login not found ",
      });
    }

    if (!data.user || !data.profile) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Data user not found ",
      });
    }

    if (status === "pending")
      return res.status(code).json({
        status: status,
        code: code,
        message: message,
        data: {
          id: data.user.id,
          full_name: data.profile.full_name,
          email: data.user.email,
        },
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

    res.status(202).json({
      status: "success",
      code: 202,
      message: "OTP register success",
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
    next(
      new AuthError({
        message: error instanceof Error ? error.message : "Error login",
        statusCode: 400,
      }),
    );
  }
};

export const handleRequestOTPLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { dataUser } = req.body;

    if (!dataUser.id || !dataUser.full_name || !dataUser.email) {
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "Data request otp not found",
      });
    }

    const user = await findUserById(dataUser.id);

    const { statusOTP, message } = await requestOTP({
      userId: user.id,
      secret: user.secret,
      email: user.email,
    });

    if (statusOTP === "false") {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: message,
      });
    }

    res.status(202).json({
      status: "success",
      code: 202,
      message: statusOTP,
      data: {
        otp: true,
      },
    });
  } catch (error) {
    console.info(error);
    next(
      new AuthError({
        message:
          error instanceof Error ? error.message : "Error request otp login",
        statusCode: 400,
      }),
    );
  }
};

export const handleVerifyOTPLogin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { dataUser } = req.body;

    const { status, code, message, data } = await verifyOTPUser({
      id: dataUser.id,
      email: dataUser.email,
      full_name: dataUser.full_name,
      token: dataUser.token,
    });

    if (status === "error")
      return res.status(code).json({
        status: status,
        code: code,
        message: message,
      });

    if (!data) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Data login not found ",
      });
    }

    if (!data.user || !data.profile) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Data user not found ",
      });
    }

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

    res.status(202).json({
      status: "success",
      code: 202,
      message: "OTP register success",
      data: {
        otp: true,
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
      new AuthError({
        message:
          error instanceof Error ? error.message : "Error verify register",
        statusCode: 400,
      }),
    );
  }
};

export const handleForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { dataUser } = req.body;

    if (!dataUser.email)
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "User not found",
      });

    const dataUserDB = await findUserByEmail(dataUser.email);
    const profile = await getProfile(dataUserDB.id);

    res.status(200).json({
      status: "pending",
      code: 200,
      message: "Email is already",
      data: {
        id: dataUserDB.id,
        full_name: profile.full_name,
        email: dataUserDB.email,
      },
    });
  } catch (error) {
    next(
      new AuthError({
        message:
          error instanceof Error
            ? error.message
            : "Error request forgot password",
        statusCode: 400,
      }),
    );
  }
};

export const handleRequestOTPForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { dataUser } = req.body;

    if (!dataUser.email)
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "User not found",
      });

    const dataUserDB = await findUserByEmail(dataUser.email);

    const { statusOTP, message } = await requestOTP({
      userId: dataUserDB.id,
      secret: dataUserDB.secret,
      email: dataUserDB.email,
    });

    if (statusOTP === "false") {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: message,
      });
    }

    res.status(202).json({
      status: "success",
      code: 202,
      message: statusOTP,
      data: {
        otp: true,
      },
    });
  } catch (error) {
    next(
      new AuthError({
        message:
          error instanceof Error
            ? error.message
            : "Error request otp forgot password",
        statusCode: 400,
      }),
    );
  }
};

export const handleVerifyOTPForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { dataUser } = req.body;

    const { status, code, message, data } = await verifyOTPUser({
      id: dataUser.id,
      email: dataUser.email,
      full_name: dataUser.full_name,
      token: dataUser.token,
    });

    if (status === "error")
      return res.status(code).json({
        status: status,
        code: code,
        message: message,
      });

    if (!data) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Data login not found ",
      });
    }

    if (!data.user || !data.profile) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Data user not found ",
      });
    }

    res.status(200).json({
      status: "pending",
      code: 200,
      message: "OTP forgot password success",
      data: {
        otp: true,
        id: data.user.id,
        full_name: data.profile.full_name,
        email: data.user.email,
        avatar: data.profile.avatar,
      },
    });
  } catch (error) {
    next(
      new AuthError({
        message:
          error instanceof Error
            ? error.message
            : "Error verify otp forgot password",
        statusCode: 400,
      }),
    );
  }
};

export const handleSetPasswordForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { dataUser } = req.body;

    const { status, code, message, data } = await setPassword(dataUser);

    if (status === "error")
      return res.status(code).json({
        status: status,
        code: code,
        message: message,
      });

    if (!data) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Data login not found ",
      });
    }

    if (!data.user || !data.profile) {
      return res.status(400).json({
        status: "error",
        code: 400,
        message: "Data login not found ",
      });
    }

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
      message: "Update password success",
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
    next(
      new AuthError({
        message:
          error instanceof Error
            ? error.message
            : "Error set password forgot password",
        statusCode: 400,
      }),
    );
  }
};

export const handleRefresh = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { accessToken, refreshToken, status } = req;

    if (status === "refresh")
      res.cookie("refresh-token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: (process.env.SAMESITE as "none" | "lax" | "strict") || "none",
        maxAge: 1000 * 60 * 60 * 168,
        path: "/",
      });

    res.status(202).json({
      status: "success",
      code: 202,
      message: "Refresh token success",
      tokens: status === "refresh" ? { accessToken } : undefined,
    });
  } catch (error) {
    next(
      new AuthError({
        message: error instanceof Error ? error.message : "Error refresh",
        statusCode: 400,
      }),
    );
  }
};

export const handleLogout = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    res.clearCookie("refresh-token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: (process.env.SAMESITE as "none" | "lax" | "strict") || "none",
      maxAge: 1000 * 60 * 60 * 168,
      path: "/",
    });

    res.status(204).json({
      status: "success",
      code: 204,
      message: "Logout success",
    });
  } catch (error) {
    next(
      new AuthError({
        message: error instanceof Error ? error.message : "Error logout",
        statusCode: 400,
      }),
    );
  }
};
