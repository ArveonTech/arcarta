import { pool } from "../database/db";
import { AuthError } from "../middlewares/errorHandler";
import { Profile, User } from "../types/auth-types.js";
import { generateSecret } from "otplib";

interface markAccountActionVerified {
  full_name: string;
  email: string;
  password: string;
}

type CreateVerifiedAccountResult = {
  user: User;
  profile: Profile;
};

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
    if (error instanceof TypeError) {
      throw new AuthError({
        message: `Failed create account verify user: ${error.message}`,
        statusCode: 400,
      });
    } else {
      throw new AuthError({
        message: `Failed create account verify user`,
        statusCode: 400,
      });
    }
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
    if (error instanceof TypeError) {
      throw new AuthError({
        message: `Failed add user google: ${error.message}`,
        statusCode: 400,
      });
    } else {
      throw new AuthError({
        message: `Failed add user google`,
        statusCode: 400,
      });
    }
  }
};
