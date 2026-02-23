import { NextFunction, Request, Response } from "express";
import * as orderService from "../services/order.service";
import { OrderError } from "../middlewares/errorHandler";

export const handleAddOrder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    const { address, paymentMethod } = req.body;

    if (!user)
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "User not found",
      });

    const { status, code, message, data } = await orderService.addOrder(
      Number(user.id),
      address,
      paymentMethod,
    );

    if (status === "error")
      return res.status(code).json({
        status: status,
        code: code,
        message: message,
      });

    res.status(200).json({
      status,
      code,
      message,
      data,
    });
  } catch (error: any) {
    next(
      new OrderError({
        message: error instanceof Error ? error.message : "Error create order",
        statusCode: 400,
      }),
    );
  }
};

export const handleGetAllOrders = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    const { status, code, message, data } = await orderService.getAllOrders(
      page,
      limit,
    );

    if (status === "error")
      return res.status(code).json({
        status: status,
        code: code,
        message: message,
      });

    res.status(200).json({
      status,
      code,
      message,
      data,
    });
  } catch (error) {
    next(error);
  }
};

export const handleGetOrderById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user)
      return res.status(404).json({
        status: "error",
        code: 404,
        message: "User not found",
      });

    const { status, code, message, data } = await orderService.getOrderById(
      Number(user.id),
      Number(id),
    );

    if (status === "error")
      return res.status(code).json({
        status: status,
        code: code,
        message: message,
      });

    res.status(200).json({
      status,
      code,
      message,
      data,
    });
  } catch (error) {
    next(error);
  }
};
