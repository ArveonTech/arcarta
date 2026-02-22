import { Request, Response, NextFunction } from "express";
import * as productService from "../services/product.service";
import { ProductError } from "../middlewares/errorHandler";
import { pool } from "../database/db";
import path from "path";
import fs from "fs/promises";

export const handleGetProducts = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { title, price, category } = req.query;

    const filters: any = {};

    if (typeof title === "string") {
      filters.title = title;
    }

    if (typeof price === "string") {
      filters.price = Number(price);
    }

    if (typeof category === "string") {
      filters.category = category;
    }

    const products = await productService.getAllProducts(filters);

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Get products success",
      data: products,
    });
  } catch (error) {
    console.info(error);
    next(
      new ProductError({
        message: error instanceof Error ? error.message : "Error get products",
        statusCode: 400,
      }),
    );
  }
};

export const handleGetProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);

    const product = await productService.getProductById(id);

    if (!product)
      res.status(404).json({
        status: "success",
        code: 404,
        message: "Product not found",
      });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Get product success",
      data: product,
    });
  } catch (error) {
    console.info(error);
    next(
      new ProductError({
        message: error instanceof Error ? error.message : "Error get product",
        statusCode: 400,
      }),
    );
  }
};

export const handleInsertProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const file = req.file;

    const { status, code, message, data } = await productService.createProduct(
      req.body,
      file?.path,
    );

    if (status === "error" || !data)
      return res.status(code).json({
        status: status,
        code: code,
        message: message,
      });

    res.status(201).json({
      status: "success",
      code: 201,
      message: "Add product success",
      data: data.product,
    });
  } catch (error) {
    console.info(error);
    next(
      new ProductError({
        message: error instanceof Error ? error.message : "Error add product",
        statusCode: 400,
      }),
    );
  }
};

export const handleUpdateProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);

    await pool.query("BEGIN");
    const resultUpdatedProduct = await productService.updateProduct(id, {
      name: req.body.name,
      price: Number(req.body.price),
      category_id: Number(req.body.category_id),
      description: req.body.description,
    });

    if (!resultUpdatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!req.file) {
      return res.status(200).json({
        status: "success",
        code: 200,
        message: "update product success",
        data: resultUpdatedProduct,
      });
    }

    const oldImageResult = await pool.query(
      "SELECT * FROM catalog.images WHERE product_id = $1",
      [id],
    );

    const oldImage = oldImageResult.rows[0];

    const newPath = `/uploads/${req.file.filename}`;

    await pool.query(
      `UPDATE catalog.images
           SET src = $1
           WHERE product_id = $2`,
      [newPath, id],
    );

    if (oldImage?.src) {
      const oldFilePath = path.join(process.cwd(), oldImage.src);
      await fs.unlink(oldFilePath).catch(() => {});
    }

    await pool.query("COMMIT");

    return res.status(200).json({
      status: "success",
      code: 200,
      message: "update product success",
      data: resultUpdatedProduct,
    });
  } catch (error) {
    console.info(error);
    await pool.query("ROLLBACK");

    if (req.file) {
      const newFilePath = path.join(
        process.cwd(),
        "uploads",
        req.file.filename,
      );
      await fs.unlink(newFilePath).catch(() => {});
    }

    next(
      new ProductError({
        message:
          error instanceof Error ? error.message : "Error update product",
        statusCode: 400,
      }),
    );
  }
};

export const handleRemoveProduct = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);

    const { status, code, message, data } =
      await productService.deleteProduct(id);

    if (status === "error")
      return res.status(code).json({
        status: status,
        code: code,
        message: message,
      });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "Product deleted success",
      data: null,
    });
  } catch (error) {
    console.info(error);
    next(
      new ProductError({
        message:
          error instanceof Error ? error.message : "Error delete product",
        statusCode: 400,
      }),
    );
  }
};
