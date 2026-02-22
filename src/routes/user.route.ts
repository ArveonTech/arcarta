import express from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import {
  handleChangeProfile,
  handleGetUsers,
  handleMe,
  verifyUser,
} from "../controllers/user.controller";
import { requireAdmin } from "../middlewares/role.middleare";

const app = express();
app.use(express.json());
const userRoute = express.Router();

userRoute.get("/me", verifyToken, verifyUser, handleMe);

userRoute.put("/change-profile", verifyToken, verifyUser, handleChangeProfile);

userRoute.get(
  "/get-users",
  verifyToken,
  verifyUser,
  requireAdmin,
  handleGetUsers,
);

export default userRoute;
