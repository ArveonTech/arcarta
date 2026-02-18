import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { type Request, type Response, type NextFunction } from "express";
import authRoute from "./routes/auth.route";
import userRoute from "./routes/user.route";

export interface AppError extends Error {
  status?: number;
  statusCode: number;
  isOperational: boolean;
}

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// Routes
app.use("/auth", authRoute);
app.use("/users", userRoute);

// Global error handler (should be after routes)
app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  const status = err?.statusCode || 500;
  console.info(err);
  const message = err?.isOperational ? err.message : "Something went wrong";

  res.status(status).json({
    status: "error",
    code: status,
    message,
  });
});

export default app;
