import { Request, Response, NextFunction } from "express";

export const validateCreateProduct = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { name, price, description, category } = req.body;

  if (!name) {
    return res.status(400).json({
      status: "error",
      message: "Product name is required",
    });
  }

  if (typeof name !== "string") {
    return res.status(400).json({
      status: "error",
      message: "Product name must be a string",
    });
  }

  if (name.length > 100) {
    return res.status(400).json({
      status: "error",
      message: "Product name must be less than 100 characters",
    });
  }

  if (price === undefined) {
    return res.status(400).json({
      status: "error",
      message: "Price is required",
    });
  }

  if (typeof price !== "number" || !Number.isInteger(price)) {
    return res.status(400).json({
      status: "error",
      message: "Price must be an integer number",
    });
  }

  if (price <= 0) {
    return res.status(400).json({
      status: "error",
      message: "Price must be greater than 0",
    });
  }

  if (description && description.length > 100) {
    return res.status(400).json({
      status: "error",
      message: "Description must be less than 100 characters",
    });
  }

  if (!category) {
    return res.status(400).json({
      status: "error",
      message: "Category is required",
    });
  }

  next();
};
