import express from "express";
import { verifyUser } from "../controllers/user.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import {
  handleAddReviews,
  handleDeleteReview,
  handleUpdateReviews,
} from "../controllers/review.controller";

const app = express();
app.use(express.json());
const reviewRoute = express.Router();

reviewRoute.post("", verifyToken, verifyUser, handleAddReviews);

reviewRoute.put("/:id", verifyToken, verifyUser, handleUpdateReviews);

reviewRoute.delete("/:id", verifyToken, verifyUser, handleDeleteReview);

export default reviewRoute;
