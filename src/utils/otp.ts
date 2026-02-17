import { generate } from "otplib";
import { sendMeessage } from "./email";
import { pool } from "../database/db";
import { AuthError } from "../middlewares/errorHandler";
import { toPgTimestamp } from "./to-postgres-timestamp";
import { User } from "../types/auth-types";

export const generateTokenOTP = async (secret: string) => {
  const token = await generate({ secret });
  return token; // token
};

type OTPReturn = {
  statusOTP: string;
  message: string;
};

type OTPVerifyReturn = {
  success: boolean;
  message: string;
};

export const requestOTP = async ({
  userId,
  secret,
  email,
}: {
  userId: string;
  secret: string;
  email: string;
}): Promise<OTPReturn> => {
  const id: number = parseInt(userId);

  try {
    const now = new Date();
    const expiredAt = toPgTimestamp(new Date(now.getTime() + 60 * 1000));

    const user = (
      await pool.query<User>("Select * from auth.users where id=$1", [userId])
    ).rows[0];

    if (user?.is_verified) {
      return { statusOTP: "false", message: "The account has been verifieds" };
    }

    const resultGenerateTokenOTP = await generateTokenOTP(secret);

    const resultAddTokenInDB = await pool.query(
      "INSERT INTO auth.otp_codes (user_id, otp, otp_expired_at, created_at) VALUES ($1, $2, $3, $4)",
      [id, resultGenerateTokenOTP, expiredAt, toPgTimestamp(new Date())],
    );

    if (resultAddTokenInDB.rowCount === 0)
      return { statusOTP: "ok", message: "Request processed" };

    const resutlSendMessageOTP = await sendMeessage({
      token: resultGenerateTokenOTP,
      recipientEmail: email,
      expire: 1,
    });

    return { statusOTP: "ok", message: `${resultGenerateTokenOTP}` };
  } catch (error) {
    console.info(error);
    if (error instanceof TypeError) {
      throw new AuthError({
        message: `Error request OTP : ${error.message}`,
        statusCode: 401,
      });
    } else {
      throw new AuthError({ message: `Error request OTP`, statusCode: 401 });
    }
  }
};

export const verifyOTP = async (
  userId: string,
  otpInput: string,
): Promise<OTPVerifyReturn> => {
  const result = await pool.query<{ otp: string }>(
    `SELECT * FROM auth.otp_codes
     WHERE user_id = $1 AND otp_expired_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [userId],
  );

  const latestOtp = result.rows[0];
  if (!latestOtp) {
    return { success: false, message: "OTP expired or not found" };
  }

  if (latestOtp.otp !== otpInput) {
    return { success: false, message: "OTP invalid" };
  }

  await pool.query(`UPDATE auth.users SET is_verified = true WHERE id = $1`, [
    userId,
  ]);

  await pool.query(
    `DELETE FROM auth.otp_codes WHERE user_id = $1 AND otp = $2`,
    [userId, otpInput],
  );

  return { success: true, message: "User verified successfully" };
};
