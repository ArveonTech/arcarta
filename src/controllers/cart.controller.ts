import { NextFunction, Request, Response } from "express";
import * as cartService from "../services/cart.service";
import { CartError } from "../middlewares/errorHandler";

export const handleGetCart = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    if (!user)
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "User not found",
      });

    const { status, code, message, data } = await cartService.getCart(
      Number(user.id),
    );

    if (status === "error")
      return res.status(code).json({
        status: status,
        code: code,
        message: message,
      });

    res.status(200).json({
      status: "success",
      code: 200,
      message: "get cart successfully",
      data,
    });
  } catch (error: any) {
    next(
      new CartError({
        message: error instanceof Error ? error.message : "Error get cart",
        statusCode: 400,
      }),
    );
  }
};

export const handleAddToCart = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    const { product_id, quantity } = req.body;

    if (!user)
      return {
        status: "error",
        code: 404,
        message: "User not found",
        data: null,
      };

    if (!product_id || !quantity) {
      return res.status(400).json({
        success: false,
        message: "product_id and quantity are required",
      });
    }

    const { status, code, message, data } = await cartService.addToCart(
      Number(user.id),
      product_id,
      quantity,
    );

    if (status === "error") {
      return res.status(code).json({
        status,
        code,
        message,
        data: null,
      });
    }

    res.status(200).json({
      status: "success",
      code: 200,
      message: "cart added successfully",
      data,
    });
  } catch (error: any) {
    next(
      new CartError({
        message: error instanceof Error ? error.message : "Error add cart",
        statusCode: 400,
      }),
    );
  }
};

export const handleUpdateCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    const product_id = req.params.id;

    if (!user)
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "User not found",
      });

    if (!product_id)
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "product update not found",
      });

    const { quantity } = req.body;

    const { status, code, message, data } = await cartService.updateCartItem(
      Number(user.id),
      Number(product_id),
      Number(quantity),
    );

    if (status === "error")
      return res.status(code).json({
        status,
        code,
        message,
      });

    res.status(200).json({
      status: "success",
      code: 200,
      message,
      data,
    });
  } catch (error: any) {
    next(
      new CartError({
        message:
          error instanceof Error ? error.message : "Error update cart item",
        statusCode: 400,
      }),
    );
  }
};

export const handleDeleteCartItem = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    if (!user)
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "User not found",
      });

    const productId = Number(req.params.id);

    const { status, code, message, data } = await cartService.deleteCartItem(
      Number(user.id),
      productId,
    );

    if (status === "error")
      return res.status(code).json({
        status,
        code,
        message,
      });

    res.status(200).json({
      status: "success",
      code: 200,
      message,
      data,
    });
  } catch (error: any) {
    next(
      new CartError({
        message:
          error instanceof Error ? error.message : "Error delete cart item",
        statusCode: 400,
      }),
    );
  }
};
