import express from "express";
import { verifyUser } from "../controllers/user.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import {
  handleAddToCart,
  handleDeleteCartItem,
  handleGetCart,
  handleUpdateCartItem,
} from "../controllers/cart.controller";

const app = express();
app.use(express.json());
const cartRoute = express.Router();

cartRoute.get("", verifyToken, verifyUser, handleGetCart);

cartRoute.post("", verifyToken, verifyUser, handleAddToCart);

cartRoute.put("/:id", verifyToken, verifyUser, handleUpdateCartItem);

cartRoute.delete("/:id", verifyToken, verifyUser, handleDeleteCartItem);

export default cartRoute;
