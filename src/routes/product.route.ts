import express from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import {
  getProduct,
  getProducts,
  insertProduct,
  removeProduct,
  updateProduct,
} from "../controllers/product.controller";
import { requireAdmin } from "../middlewares/role.middleare";
import { uploadMiddleware } from "../middlewares/upload.middleware";

const app = express();
app.use(express.json());
const productRoute = express.Router();

productRoute.get("/", verifyToken, getProducts);

productRoute.get("/:id", verifyToken, getProduct);

productRoute.post(
  "/",
  verifyToken,
  requireAdmin,
  uploadMiddleware,
  insertProduct,
);

productRoute.put(
  "/:id",
  verifyToken,
  requireAdmin,
  uploadMiddleware,
  updateProduct,
);

productRoute.delete("/:id", verifyToken, requireAdmin, removeProduct);

export default productRoute;
