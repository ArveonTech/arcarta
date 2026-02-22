// controllers/review.controller.ts
import { Request, Response, NextFunction } from "express";
import * as reviewService from "../services/review.service";
import { ReviewsError } from "../middlewares/errorHandler";

export const handleAddReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { product_id, review_text, rating } = req.body;
    const user = req.user;

    if (!user)
      return {
        status: "error",
        code: 500,
        message: "User not found",
        data: null,
      };

    const { status, code, message, data } = await reviewService.addReview(
      Number(product_id),
      Number(user.id),
      review_text,
      Number(rating),
    );

    if (status === "error")
      return res.status(code).json({
        status,
        code,
        message,
      });

    res.json({
      status: "success",
      code: 200,
      message: "Add reviews success",
      data,
    });
  } catch (error) {
    next(
      new ReviewsError({
        message: error instanceof Error ? error.message : "Error add review",
        statusCode: 400,
      }),
    );
  }
};

export const handleUpdateReviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);
    const { review_text, rating } = req.body;

    const { status, code, message, data } = await reviewService.updateReview(
      id,
      review_text,
      rating,
    );

    if (status === "error")
      return res.status(code).json({
        status,
        code,
        message,
      });

    res.json({
      status: "success",
      code: 200,
      message: "Review updated successfully",
      data,
    });
  } catch (error) {
    console.info(error);
    next(
      new ReviewsError({
        message: error instanceof Error ? error.message : "Error update review",
        statusCode: 400,
      }),
    );
  }
};

export const handleDeleteReview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = Number(req.params.id);

    const { status, code, message, data } =
      await reviewService.deleteReview(id);

    if (status === "error")
      return res.status(code).json({
        status,
        code,
        message,
      });

    res.json({
      status: "success",
      code: 200,
      message: "Review deleted successfully",
    });
  } catch (error) {
    console.info(error);
    next(
      new ReviewsError({
        message: error instanceof Error ? error.message : "Error delete review",
        statusCode: 400,
      }),
    );
  }
};
