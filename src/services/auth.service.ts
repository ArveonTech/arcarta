import {
  GetTokenResponse,
  OAuth2Client,
} from "google-auth-library/build/src/auth/oauth2client.js";
import { google } from "googleapis";
import {
  AuthenticateGoogleUserReturn,
  DataFromGoogle,
  DataUserRegister,
  DataUserSetPassword,
  GoogleUserData,
  JWTPayload,
  Profile,
  User,
  ValidateDataReturn,
} from "../types/auth-types";
import { pool } from "../database/db";
import { validatePassword, validateUser } from "../utils/validate-user";
import { findUserByEmail, findUserById, getProfile } from "./user.service";
import { verifyOTP } from "../utils/otp";
import {
  CreateVerifiedAccountResult,
  markAccountActionVerified,
} from "../types/user-type";
import { generateSecret } from "otplib";

if (
  !process.env.CLIENT_ID ||
  !process.env.CLIENT_SECRET ||
  !process.env.REDIRECT_URI
) {
  throw new Error("Missing Google OAuth env variables!");
}

const oauth2Client = new OAuth2Client({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI,
});

type TokensGoogle = GetTokenResponse["tokens"];

export const getGoogleUserFromCode = async (
  code: string,
): Promise<GoogleUserData> => {
  const { tokens }: { tokens: TokensGoogle } =
    await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({
    auth: oauth2Client,
    version: "v2",
  });
  const { data } = await oauth2.userinfo.get();

  return data;
};

export const authenticateGoogleUser = async (
  data: DataFromGoogle,
): Promise<AuthenticateGoogleUserReturn> => {
  if (!data.email || !data.name) {
    return { status: "failed", data: null };
  }

  const userResult = await pool.query<User>(
    "SELECT * FROM auth.users WHERE email=$1",
    [data.email],
  );
  const profileResult = await pool.query<Profile>(
    "SELECT * FROM auth.profiles WHERE full_name=$1",
    [data.name],
  );

  const foundUser = userResult.rows[0];
  const foundProfile = profileResult.rows[0];

  if (!foundUser) {
    return {
      status: "register",
      data: { email: data.email, full_name: data.name },
    };
  }

  if (!foundProfile) {
    return { status: "failed", data: null };
  }

  return {
    status: "login",
    data: { user: foundUser, profile: foundProfile },
  };
};

export const validateDataUserSetPassword = (
  dataUser: DataUserSetPassword,
): ValidateDataReturn => {
  if (
    !dataUser.status ||
    !dataUser.user.email ||
    !dataUser.user.password ||
    !dataUser.user.full_name
  )
    return {
      status: "error",
      code: 404,
      message: "Data register not found",
      data: null,
    };

  if (dataUser.status !== "register")
    return {
      status: "error",
      code: 400,
      message: "Invalid status register",
      data: null,
    };

  const dataUserRegister = dataUser.user;
  if (
    !dataUserRegister.email ||
    !dataUserRegister.full_name ||
    !dataUserRegister.password
  )
    return {
      status: "error",
      code: 404,
      message: "Data not found",
      data: null,
    };

  // validate user
  const errorMsgValidateUser = validateUser({
    full_name: dataUser.user.full_name,
    email: dataUser.user.email,
    password: dataUser.user.password,
  });
  if (errorMsgValidateUser) {
    return {
      status: "error",
      code: 400,
      message: errorMsgValidateUser,
      data: null,
    };
  }

  return {
    status: "success",
    code: 200,
    message: "Success",
    data: null,
  };
};

export const addUserAccountVerified = async (
  dataUser: markAccountActionVerified,
): Promise<CreateVerifiedAccountResult> => {
  try {
    const { full_name, email, password } = dataUser;

    const secret: string = generateSecret();

    await pool.query("BEGIN");
    const newAccountUser = (
      await pool.query<User>(
        "insert into auth.users (password,email,is_verified,role,secret) values ($1,$2,$3,$4,$5) returning *",
        [password, email, false, "user", secret],
      )
    ).rows[0];

    if (!newAccountUser)
      throw new Error("Failed to create verification account");

    const newAccountProfile = (
      await pool.query<Profile>(
        "insert into auth.profiles (user_id,full_name) values ($1,$2) returning *",
        [newAccountUser.id, full_name],
      )
    ).rows[0];

    if (!newAccountProfile)
      throw new Error("Failed to create verification account");

    await pool.query("COMMIT");
    return { user: newAccountUser, profile: newAccountProfile };
  } catch (error) {
    await pool.query("ROLLBACK");
    console.info(error);
    throw new Error(error instanceof Error ? error.message : "Error login");
  }
};

export const addUserAccountGoogle = async (
  password: string,
  email: string,
  full_name: string,
) => {
  try {
    const secret: string = generateSecret();

    await pool.query("BEGIN");

    const userDBComplate = (
      await pool.query<User>(
        "insert into auth.users (password,email,is_verified,role,secret) values ($1,$2,$3,$4,$5) returning *",
        [password, email, false, "user", secret],
      )
    ).rows[0];

    if (!userDBComplate) throw new Error("Failed to create account");

    const newAccountProfile = (
      await pool.query<Profile>(
        "insert into auth.profiles (user_id,full_name) values ($1,$2,$3) returning *",
        [userDBComplate.id, full_name],
      )
    ).rows[0];

    if (!newAccountProfile) throw new Error("Failed to create account");

    await pool.query("COMMIT");
    return { user: userDBComplate, profile: newAccountProfile };
  } catch (error) {
    await pool.query("ROLLBACK");
    console.info(error);
    throw new Error(
      error instanceof Error ? error.message : "Error add user google",
    );
  }
};

export const getPayloadJWT = async (newAccountUser: User) => {
  const user = await pool.query<User>(
    "Select * from auth.users where email=$1",
    [newAccountUser.email],
  );

  if (!user.rows[0] || user.rows.length === 0)
    throw new Error("User not found");

  const profile = await pool.query<Profile>(
    "Select * from auth.profiles where user_id=$1",
    [user.rows[0].id],
  );

  const foundUser = user.rows[0];
  const foundProfile = profile.rows[0];

  if (!foundProfile) throw new Error("User not found");

  const payloadJWT: JWTPayload = {
    id: foundUser.id,
    avatar: foundProfile.avatar,
    email: foundUser.email,
    full_name: foundProfile.full_name,
    role: foundUser.role,
  };

  return payloadJWT;
};

export const validateDataRegister = (
  dataUser: DataUserRegister,
): ValidateDataReturn => {
  if (!dataUser.email || !dataUser.full_name || !dataUser.password)
    return {
      status: "error",
      code: 400,
      message: "Failed register",
      data: null,
    };

  // validate user
  const { full_name, email, password } = dataUser;
  const errorMsgValidateUser = validateUser({ full_name, email, password });
  if (errorMsgValidateUser) {
    return {
      status: "error",
      code: 400,
      message: errorMsgValidateUser,
      data: null,
    };
  }

  return {
    status: "success",
    code: 200,
    message: "Success",
    data: null,
  };
};

export const validateDataLogin = async (dataUser: {
  email: string;
  password: string;
}): Promise<ValidateDataReturn> => {
  const dataUserDB = await findUserByEmail(dataUser.email);

  if (dataUser?.password !== dataUserDB.password)
    return {
      status: "error",
      code: 401,
      message: "Wrong password",
      data: null,
    };

  const profile = await getProfile(dataUserDB.id);

  // account is already but not verified
  if (dataUserDB.is_verified === false) {
    return {
      status: "pending",
      code: 200,
      message: "Account exists but not verified. Please verify your email.",
      data: {
        user: dataUserDB,
        profile,
      },
    };
  }

  return {
    status: "success",
    code: 200,
    message: "Validated data",
    data: {
      user: dataUserDB,
      profile,
    },
  };
};

export const verifyOTPUser = async (dataUser: {
  id: string;
  full_name: string;
  email: string;
  token: string;
}): Promise<ValidateDataReturn> => {
  if (!dataUser.id || !dataUser.full_name || !dataUser.email || !dataUser.token)
    return {
      status: "error",
      code: 404,
      message: "Data verify otp not found",
      data: null,
    };

  const user = await findUserById(dataUser.id);
  const profile = (
    await pool.query<Profile>("Select * from auth.profiles where user_id=$1", [
      user.id,
    ])
  ).rows[0];

  const userDBComplate = await verifyOTP(user.id, dataUser.token);

  if (!userDBComplate.success)
    return {
      status: "error",
      code: 400,
      message: userDBComplate.message,
      data: null,
    };

  if (!profile)
    return {
      status: "error",
      code: 400,
      message: "Failed account verification",
      data: null,
    };

  return {
    status: "success",
    code: 200,
    message: "Verification account success",
    data: {
      profile,
      user,
    },
  };
};

export const setPassword = async (dataUser: {
  id: string;
  full_name: string;
  email: string;
  otp: boolean;
  avatar: string;
  newPassword: string;
}): Promise<ValidateDataReturn> => {
  if (
    !dataUser.id ||
    !dataUser.full_name ||
    !dataUser.email ||
    !dataUser.otp ||
    !dataUser.avatar ||
    !dataUser.newPassword
  )
    return {
      status: "error",
      code: 404,
      message: "Data set password not found",
      data: null,
    };

  const errorMsgValidateUser = validatePassword(dataUser.newPassword);
  if (errorMsgValidateUser) {
    return {
      status: "error",
      code: 400,
      message: errorMsgValidateUser,
      data: null,
    };
  }

  const user = await findUserByEmail(dataUser.email);
  const profile = await getProfile(user.id);

  const resultUpdateForgotPassword = (
    await pool.query(
      "update auth.users set password=$1 where id=$2 returning *",
      [dataUser.newPassword, user.id],
    )
  ).rows[0];

  if (!resultUpdateForgotPassword)
    return {
      status: "error",
      code: 400,
      message: "Error set password",
      data: null,
    };

  return {
    status: "success",
    code: 200,
    message: "Verification account success",
    data: {
      profile,
      user,
    },
  };
};
