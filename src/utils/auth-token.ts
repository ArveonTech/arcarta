import jwt from "jsonwebtoken";

const accessKey = process.env.ACCESS_SECRET_KEY;
const refreshKey = process.env.REFRESH_SECRET_KEY;

if (!accessKey || !refreshKey) throw new Error("JWT secret missing");

export const createAccessToken = ({ payload }: { payload: object }) =>
  jwt.sign(payload, accessKey, { expiresIn: "7d" });

export const createRefreshToken = ({ payload }: { payload: object }) =>
  jwt.sign(payload, refreshKey, { expiresIn: "7d" });
