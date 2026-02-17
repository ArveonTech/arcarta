import { pool } from "../database/db";
import { AuthError } from "../middlewares/errorHandler";
import { Profile, User } from "../types/auth-types.js";
import { generateSecret } from "otplib";

export const findUserById = async (id: string): Promise<User> => {
  const result = await pool.query<User>(
    "SELECT * FROM auth.users WHERE id=$1",
    [id],
  );

  if (result.rows.length === 0 || typeof result.rows[0] === "undefined") {
    throw new Error("User not found");
  }

  return result.rows[0];
};

export const findUserByEmail = async (email: string): Promise<User> => {
  const result = await pool.query<User>(
    "SELECT * FROM auth.users WHERE email=$1",
    [email],
  );

  if (result.rows.length === 0 || typeof result.rows[0] === "undefined") {
    throw new Error("User not found");
  }

  return result.rows[0];
};

export const getProfile = async (userId: string) => {
  const profile = await pool.query<Profile>(
    "Select * from auth.profiles where user_id=$1",
    [userId],
  );

  if (profile.rows.length === 0 || typeof profile.rows[0] === "undefined") {
    throw new Error("Profile not found");
  }

  return profile.rows[0];
};
