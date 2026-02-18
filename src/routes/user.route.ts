import express from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import {
  handleChangeProfile,
  handleMe,
  verifyUser,
} from "../controllers/user.controller";

const app = express();
app.use(express.json());
const userRoute = express.Router();

userRoute.get("/me", verifyToken, verifyUser, handleMe);

userRoute.post("/change-profile", verifyToken, verifyUser, handleChangeProfile);

export default userRoute;
