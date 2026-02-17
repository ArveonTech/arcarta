import jwt from "jsonwebtoken";
import { authenticateToken } from "../helpers/authenticate-token.js";
import { type Request, type Response, type NextFunction } from "express";

interface CustomRequestVerifyToken extends Request {
  status?: "ok" | "refresh";
  refreshToken?: string;
  accessToken?: string;
  user?: any;
}

export const verifyToken = (
  req: CustomRequestVerifyToken,
  res: Response,
  next: NextFunction,
) => {
  // ambil access token di header
  const authHeader = req.headers["authorization"];
  const accessToken: string | undefined =
    (authHeader && authHeader.split(" ")[1]) || "";

  const refreshToken = req.cookies["refresh-token"];
  if (!accessToken && !refreshToken)
    return res.status(403).json({ message: "No token provided" });

  const result = authenticateToken({ accessToken, refreshToken });

  if (result.success === false)
    return res.status(401).json({ message: result.error });

  if (result.status === "refresh") {
    req.status = "refresh";
    req.refreshToken = result.refreshToken;
    req.accessToken = result.accessToken;
    req.user = jwt.decode(result.accessToken);
  } else if (result.status === "ok") {
    req.status = "ok";
    req.user = result.payload;
  }

  next();
};
