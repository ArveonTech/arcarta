import jwt from "jsonwebtoken";
import { createAccessToken } from "../utils/auth-token";

const accessKey = process.env.ACCESS_SECRET_KEY;
const refreshKey = process.env.REFRESH_SECRET_KEY;

if (!accessKey || !refreshKey) throw new Error("JWT secret missing");

interface DecodeRefreshPayload {
  exp: number;
  iat: number;
  [key: string]: any;
}

export const authenticateToken = ({
  accessToken,
  refreshToken,
}: {
  accessToken: string;
  refreshToken: string;
}) => {
  try {
    const decodeAccess = jwt.verify(accessToken, accessKey);
    return {
      success: true,
      code: 200,
      status: "ok",
      refreshToken: refreshToken,
      accessToken: accessToken,
      payload: decodeAccess,
    };
  } catch (err) {
    try {
      const decodeRefreshRaw = jwt.verify(refreshToken, refreshKey);

      const decodeRefresh = decodeRefreshRaw as DecodeRefreshPayload;

      const { exp, iat, ...rest } = decodeRefresh;
      return {
        success: true,
        code: 200,
        status: "refresh",
        refreshToken: refreshToken,
        accessToken: createAccessToken({ payload: rest }),
      };
    } catch (err2) {
      return { success: false, code: 500, error: err2 };
    }
  }
};
