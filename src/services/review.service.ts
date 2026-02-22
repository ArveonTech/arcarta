import { pool } from "../database/db";
import { DataReturn } from "../types/review-type";

export const addReview = async (
  product_id: number,
  user_id: number,
  review_text: string,
  rating: number,
): Promise<DataReturn> => {
  try {
    const historyReviewsProducts = await pool.query(
      `select * from catalog.reviews where user_id=$1 and product_id=$2`,
      [user_id, product_id],
    );

    if (historyReviewsProducts.rows[0])
      return {
        status: "error",
        code: 400,
        message: "reviews for this product already exist",
        data: null,
      };

    const result = await pool.query(
      `INSERT INTO catalog.reviews
        (product_id, user_id, review_text, rating)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [product_id, user_id, review_text, rating],
    );

    return {
      status: "success",
      code: 201,
      message: "Review added successfully",
      data: {
        review: result.rows[0],
      },
    };
  } catch (error: any) {
    return {
      status: "error",
      code: 500,
      message: error.message || "Failed to add review",
      data: null,
    };
  }
};

export const updateReview = async (
  id: number,
  review_text: string,
  rating: number,
): Promise<DataReturn> => {
  try {
    await pool.query("BEGIN");

    const reviewUpdate = await pool.query(
      `
      UPDATE catalog.reviews
      SET review_text = $1,
          rating = $2,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
      `,
      [review_text, rating, id],
    );

    if (reviewUpdate.rowCount === 0) throw new Error("Review not found");

    await pool.query("COMMIT");

    return {
      status: "success",
      code: 200,
      message: "Review updated successfully",
      data: {
        review: reviewUpdate.rows[0],
      },
    };
  } catch (error: any) {
    await pool.query("ROLLBACK");

    return {
      status: "error",
      code: 500,
      message: error.message || "Failed to update review",
      data: null,
    };
  }
};

export const deleteReview = async (id: number): Promise<DataReturn> => {
  try {
    await pool.query("BEGIN");

    const reviewDelete = await pool.query(
      `
      DELETE FROM catalog.reviews
      WHERE id = $1
      `,
      [id],
    );

    if (reviewDelete.rowCount === 0) throw new Error("Review not found");

    await pool.query("COMMIT");

    return {
      status: "success",
      code: 200,
      message: "Review deleted successfully",
      data: null,
    };
  } catch (error: any) {
    await pool.query("ROLLBACK");

    return {
      status: "error",
      code: 500,
      message: error.message || "Failed to delete review",
      data: null,
    };
  }
};
