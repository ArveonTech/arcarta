import { pool } from "../database/db";
import { DataReturn } from "../types/cart-type";

export const addToCart = async (
  userId: number,
  productId: number,
  quantity: number,
): Promise<DataReturn> => {
  try {
    await pool.query("BEGIN");

    let cart = await pool.query(
      "SELECT * FROM orders.carts WHERE user_id = $1",
      [userId],
    );

    if (cart.rowCount === 0) {
      cart = await pool.query(
        "INSERT INTO orders.carts (user_id, total_price) VALUES ($1, 0) RETURNING *",
        [userId],
      );
    }

    const cartId = cart.rows[0].id;

    const product = await pool.query(
      "SELECT id, price FROM catalog.products WHERE id = $1",
      [productId],
    );

    if (product.rowCount === 0) {
      return {
        status: "error",
        code: 404,
        message: "Product not found",
        data: null,
      };
    }

    const productPrice = product.rows[0].price;

    const existingItem = await pool.query(
      `SELECT * FROM orders.cart_items
       WHERE cart_id = $1 AND product_id = $2`,
      [cartId, productId],
    );

    if ((existingItem.rowCount ?? 0) > 0) {
      await pool.query(
        `UPDATE orders.cart_items
         SET quantity = quantity + $1
         WHERE cart_id = $2 AND product_id = $3`,
        [quantity, cartId, productId],
      );
    } else {
      await pool.query(
        `INSERT INTO orders.cart_items
         (cart_id, product_id, quantity, price_at_purchase)
         VALUES ($1, $2, $3, $4)`,
        [cartId, productId, quantity, productPrice],
      );
    }

    const total = await pool.query(
      `SELECT COALESCE(SUM(quantity * price_at_purchase),0) AS total
       FROM orders.cart_items
       WHERE cart_id = $1`,
      [cartId],
    );

    await pool.query(
      `UPDATE orders.carts
       SET total_price = $1, updated_at = NOW()
       WHERE id = $2`,
      [total.rows[0].total, cartId],
    );

    await pool.query("COMMIT");

    return {
      status: "success",
      code: 200,
      message: "Product added to cart",
      data: {
        cart_id: cartId,
        total_price: total.rows[0].total,
      },
    };
  } catch (error) {
    await pool.query("ROLLBACK");
    return {
      status: "error",
      code: 400,
      message: "Failed to add cart",
      data: null,
    };
  }
};

export const getCart = async (userId: number): Promise<DataReturn> => {
  try {
    const cart = await pool.query(
      "SELECT * FROM orders.carts WHERE user_id = $1",
      [userId],
    );

    if (cart.rowCount === 0) {
      return {
        status: "success",
        message: "Cart is empty",
        code: 200,
        data: {
          items: [],
          total_price: 0,
        },
      };
    }

    const cartId = cart.rows[0].id;

    const items = await pool.query(
      `
      SELECT
        ci.product_id,
        p.name,
        p.price AS current_price,
        ci.quantity,
        ci.price_at_purchase,
        (ci.quantity * ci.price_at_purchase) AS subtotal
      FROM orders.cart_items ci
      JOIN catalog.products p
        ON p.id = ci.product_id
      WHERE ci.cart_id = $1
      `,
      [cartId],
    );

    return {
      status: "success",
      message: "Cart fetched successfully",
      code: 200,
      data: {
        items: items.rows,
      },
    };
  } catch (error) {
    return {
      status: "error",
      code: 400,
      message: "Failed get cart",
      data: null,
    };
  }
};

export const updateCartItem = async (
  userId: number,
  productId: number,
  quantity: number,
): Promise<DataReturn> => {
  try {
    await pool.query("BEGIN");

    const cart = await pool.query(
      "SELECT * FROM orders.carts WHERE user_id = $1",
      [userId],
    );

    if (cart.rowCount === 0) {
      await pool.query("ROLLBACK");
      return {
        status: "error",
        code: 404,
        message: "Cart not found",
        data: null,
      };
    }

    const cartId = cart.rows[0].id;

    const item = await pool.query(
      `SELECT * FROM orders.cart_items
       WHERE cart_id = $1 AND product_id = $2`,
      [cartId, productId],
    );

    if ((item.rowCount ?? 0) === 0) {
      await pool.query("ROLLBACK");
      return {
        status: "error",
        code: 404,
        message: "Product not found in cart",
        data: null,
      };
    }

    if (quantity === 0) {
      await pool.query(
        `DELETE FROM orders.cart_items
         WHERE cart_id = $1 AND product_id = $2`,
        [cartId, productId],
      );
    } else {
      await pool.query(
        `UPDATE orders.cart_items
         SET quantity = $1
         WHERE cart_id = $2 AND product_id = $3`,
        [quantity, cartId, productId],
      );
    }

    const total = await pool.query(
      `SELECT COALESCE(SUM(quantity * price_at_purchase),0) AS total
       FROM orders.cart_items
       WHERE cart_id = $1`,
      [cartId],
    );

    await pool.query(
      `UPDATE orders.carts
       SET total_price = $1, updated_at = NOW()
       WHERE id = $2`,
      [total.rows[0].total, cartId],
    );

    await pool.query("COMMIT");

    return {
      status: "success",
      code: 200,
      message:
        quantity === 0
          ? "Product removed from cart"
          : "Cart updated successfully",
      data: {
        cart_id: cartId,
        total_price: total.rows[0].total,
      },
    };
  } catch (error) {
    console.info(error);
    await pool.query("ROLLBACK");
    return {
      status: "error",
      code: 400,
      message: "Failed update cart",
      data: null,
    };
  }
};

export const deleteCartItem = async (
  userId: number,
  productId: number,
): Promise<DataReturn> => {
  try {
    await pool.query("BEGIN");

    const cart = await pool.query(
      "SELECT * FROM orders.carts WHERE user_id = $1",
      [userId],
    );

    if (cart.rowCount === 0) {
      await pool.query("ROLLBACK");
      return {
        status: "error",
        code: 404,
        message: "Cart not found",
        data: null,
      };
    }

    const cartId = cart.rows[0].id;

    const deleted = await pool.query(
      `DELETE FROM orders.cart_items
       WHERE cart_id = $1 AND product_id = $2`,
      [cartId, productId],
    );

    if ((deleted.rowCount ?? 0) === 0) {
      await pool.query("ROLLBACK");
      return {
        status: "error",
        code: 404,
        message: "Product not found in cart",
        data: null,
      };
    }

    const total = await pool.query(
      `SELECT COALESCE(SUM(quantity * price_at_purchase),0) AS total
       FROM orders.cart_items
       WHERE cart_id = $1`,
      [cartId],
    );

    await pool.query(
      `UPDATE orders.carts
       SET total_price = $1, updated_at = NOW()
       WHERE id = $2`,
      [total.rows[0].total, cartId],
    );

    await pool.query("COMMIT");

    return {
      status: "success",
      code: 200,
      message: "Product removed from cart",
      data: {
        cart_id: cartId,
        total_price: total.rows[0].total,
      },
    };
  } catch (error) {
    console.info(error);
    await pool.query("ROLLBACK");
    return {
      status: "error",
      code: 400,
      message: "Failed delete cart item",
      data: null,
    };
  }
};
