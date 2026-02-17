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
import { validateUser } from "../utils/validate-user";

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
    };

  if (dataUser.status !== "register")
    return {
      status: "error",
      code: 400,
      message: "Invalid status register",
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
    };
  }

  return {
    status: "success",
    code: 200,
    message: "Success",
  };
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
    };

  // validate user
  const { full_name, email, password } = dataUser;
  const errorMsgValidateUser = validateUser({ full_name, email, password });
  if (errorMsgValidateUser) {
    return {
      status: "error",
      code: 400,
      message: errorMsgValidateUser,
    };
  }

  return {
    status: "success",
    code: 200,
    message: "Success",
  };
};
