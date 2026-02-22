import express from "express";
import { verifyToken } from "../middlewares/auth.middleware";
import {
  handleGetProduct,
  handleGetProducts,
  handleInsertProduct,
  handleRemoveProduct,
  handleUpdateProduct,
} from "../controllers/product.controller";
import { requireAdmin } from "../middlewares/role.middleare";
import { uploadMiddleware } from "../middlewares/upload.middleware";
import { verifyUser } from "../controllers/user.controller";

const app = express();
app.use(express.json());
const productRoute = express.Router();

productRoute.get("", verifyToken, verifyUser, handleGetProducts);

productRoute.get("/:id", verifyToken, verifyUser, handleGetProduct);

productRoute.post(
  "/",
  verifyToken,
  verifyUser,
  requireAdmin,
  uploadMiddleware,
  handleInsertProduct,
);

productRoute.put(
  "/:id",
  verifyToken,
  verifyUser,
  requireAdmin,
  uploadMiddleware,
  handleUpdateProduct,
);

productRoute.delete(
  "/:id",
  verifyToken,
  verifyUser,
  requireAdmin,
  handleRemoveProduct,
);

export default productRoute;
