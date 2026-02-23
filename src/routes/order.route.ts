import express from "express";
import { verifyUser } from "../controllers/user.controller";
import { verifyToken } from "../middlewares/auth.middleware";
import {
  handleAddOrder,
  handleGetAllOrders,
  handleGetOrderById,
} from "../controllers/order.controller";
import { requireAdmin } from "../middlewares/role.middleare";

const app = express();
app.use(express.json());
const orderRoute = express.Router();

orderRoute.get("", verifyToken, verifyUser, handleGetAllOrders);

orderRoute.get(
  "/:id",
  verifyToken,
  verifyUser,
  requireAdmin,
  handleGetOrderById,
);

orderRoute.post("", verifyToken, verifyUser, requireAdmin, handleAddOrder);

export default orderRoute;
