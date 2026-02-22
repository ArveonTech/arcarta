import { pool } from "../database/db";
import { Profile, User, ValidateDataReturn } from "../types/auth-types.js";
import { validatePassword } from "../utils/validate-user";

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

export const getUserRoleById = async (userId: number) => {
  const result = await pool.query(`SELECT role FROM auth.users WHERE id = $1`, [
    userId,
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].role;
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

export const changeProfileOrPassword = async (
  user: {
    id: string;
    avatar: string;
    email: string;
    full_name: string;
    role: string;
  },
  fieldUser: string,
  value: string,
  changePassword: boolean,
): Promise<ValidateDataReturn> => {
  let result;

  if (changePassword) {
    const errorMsgValidatePassword = validatePassword(value);
    if (errorMsgValidatePassword) {
      return {
        status: "error",
        code: 400,
        message: errorMsgValidatePassword,
        data: null,
      };
    }

    result = await pool.query(
      `UPDATE auth.users
       SET password = $1
       WHERE id = $2
       updated_at=NOW()
       RETURNING *`,
      [value, user.id],
    );
  } else {
    const allowedProfileFields = ["avatar", "full_name"];

    if (!allowedProfileFields.includes(fieldUser)) {
      return {
        status: "error",
        code: 400,
        message: "Invalid field update",
        data: null,
      };
    }

    result = await pool.query(
      `UPDATE auth.profiles
       SET ${fieldUser} = $1
       WHERE user_id = $2
       RETURNING *`,
      [value, user.id],
    );
  }

  const updatedData = result.rows[0];

  if (!updatedData) {
    return {
      status: "error",
      code: 404,
      message: "Data not found",
      data: null,
    };
  }

  const userDB = await findUserById(user.id);
  const profile = await getProfile(userDB.id);

  return {
    status: "success",
    code: 200,
    message: "Update success",
    data: {
      user: userDB,
      profile,
    },
  };
};

export const getUsers = async () => {
  const resultGetUser = await pool.query<User>(
    "SELECT auth.users.id, auth.users.email, auth.users.role, auth.profiles.full_name, auth.profiles.avatar from auth.users join auth.profiles on auth.profiles.user_id=auth.users.id order by case when auth.users.role = 'admin' then 1 when auth.users.role = 'user' then 2 else 3 end",
  );

  if (
    resultGetUser.rows.length === 0 ||
    typeof resultGetUser.rows[0] === "undefined"
  ) {
    throw new Error("Users not found");
  }

  return resultGetUser.rows;
};
