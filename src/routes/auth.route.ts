import express from "express";
import { OAuth2Client } from "google-auth-library/build/src/auth/oauth2client";
import { AuthError } from "../middlewares/errorHandler";
import {
  handleForgotPassword,
  handleGoogleCallback,
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
  handleRequestOTPForgotPassword,
  handleRequestOTPLogin,
  handleRequestOTPRegister,
  handleSetPassword,
  handleSetPasswordForgotPassword,
  handleVerifyOTPForgotPassword,
  handleVerifyOTPLogin,
  handleVerifyOTPRegister,
} from "../controllers/auth.controller";
import { verifyToken } from "../middlewares/auth.middleware";

const app = express();
app.use(express.json());
const authRoute = express.Router();

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

const scopes = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

// Login or Register with Google
authRoute.get(`/google`, (req, res) => {
  try {
    const source = req.query.source;

    const authorizationUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      include_granted_scopes: true,
      state: typeof source === "string" ? source : "",
    });

    res.redirect(authorizationUrl);
  } catch (error) {
    throw new AuthError({ message: "Error register google", statusCode: 500 });
  }
});

authRoute.get(`/google/callback`, handleGoogleCallback);

authRoute.post(`/set-password`, handleSetPassword);

// Manual register
authRoute.post(`/register`, handleRegister);

authRoute.post(`/request-otp/register`, handleRequestOTPRegister);

authRoute.post(`/verify-otp/register`, handleVerifyOTPRegister);

// Login
authRoute.post(`/login`, handleLogin);

authRoute.post(`/request-otp/login`, handleRequestOTPLogin);

authRoute.post(`/verify-otp/login`, handleVerifyOTPLogin);

// forgot password
authRoute.post(`/forgot-password`, handleForgotPassword);

authRoute.post(`/request-otp/forgot-password`, handleRequestOTPForgotPassword);

authRoute.post(`/verify-otp/forgot-password`, handleVerifyOTPForgotPassword);

authRoute.post(
  `/set-password/forgot-password`,
  handleSetPasswordForgotPassword,
);

// refresh
authRoute.get(`/refresh`, verifyToken, handleRefresh);

// logout
authRoute.post(`/logout`, verifyToken, handleLogout);

export default authRoute;
