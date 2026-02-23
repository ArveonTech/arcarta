import { pool } from "../database/db";
import { DataReturn } from "../types/order-types";

export const getAllOrders = async (
  page: number = 1,
  limit: number = 10,
): Promise<DataReturn> => {
  try {
    const offset = (page - 1) * limit;

    // ambil total data
    const totalResult = await pool.query(`SELECT COUNT(*) FROM orders.orders`);

    const totalData = Number(totalResult.rows[0].count);
    const totalPages = Math.ceil(totalData / limit);

    // ambil data sesuai pagination
    const orders = await pool.query(
      `
      SELECT
        id,
        user_id,
        total_price,
        shipping_address,
        payment_method,
        created_at,
        updated_at
      FROM orders.orders
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    );

    return {
      status: "success",
      code: 200,
      message: "Orders fetched successfully",
      data: {
        page,
        limit,
        total_data: totalData,
        total_pages: totalPages,
        orders: orders.rows,
      },
    };
  } catch (error) {
    return {
      status: "error",
      code: 400,
      message: "Failed get orders",
      data: null,
    };
  }
};

export const getOrderById = async (
  userId: number,
  orderId: number,
): Promise<DataReturn> => {
  try {
    const order = await pool.query(
      `
      SELECT
        id,
        total_price,
        shipping_address,
        payment_method,
        created_at,
        updated_at
      FROM orders.orders
      WHERE id = $1 AND user_id = $2
      `,
      [orderId, userId],
    );

    if (order.rowCount === 0) {
      return {
        status: "error",
        code: 404,
        message: "Order not found",
        data: null,
      };
    }

    const items = await pool.query(
      `
      SELECT
        oi.product_id,
        p.name,
        oi.quantity,
        oi.price_at_purchase,
        (oi.quantity * oi.price_at_purchase) AS subtotal
      FROM orders.order_items oi
      JOIN catalog.products p
        ON p.id = oi.product_id
      WHERE oi.order_id = $1
      `,
      [orderId],
    );

    return {
      status: "success",
      code: 200,
      message: "Order fetched successfully",
      data: {
        ...order.rows[0],
        items: items.rows,
      },
    };
  } catch (error) {
    return {
      status: "error",
      code: 400,
      message: "Failed get order",
      data: null,
    };
  }
};

export const addOrder = async (
  userId: number,
  address: string,
  paymentMethod: string,
): Promise<DataReturn> => {
  try {
    await pool.query("BEGIN");

    // ambil carts
    const cart = await pool.query(
      "SELECT id FROM orders.carts WHERE user_id = $1",
      [userId],
    );

    if (cart.rowCount === 0) {
      await pool.query("ROLLBACK");
      return {
        status: "error",
        code: 400,
        message: "Cart not found",
        data: null,
      };
    }

    const cartId = cart.rows[0].id;

    // ambil cart item di id carts
    const cartItems = await pool.query(
      `SELECT product_id, quantity, price_at_purchase
       FROM orders.cart_items
       WHERE cart_id = $1`,
      [cartId],
    );

    if (cartItems.rowCount === 0) {
      await pool.query("ROLLBACK");
      return {
        status: "error",
        code: 400,
        message: "Cart is empty",
        data: null,
      };
    }

    const productIds = cartItems.rows.map((item) => item.product_id);

    // cari product id yg sesuai dengan array id pada cart_item
    const productCheck = await pool.query(
      `SELECT id FROM catalog.products WHERE id = ANY($1::int[])`,
      [productIds],
    );

    if (productCheck.rowCount !== productIds.length) {
      await pool.query("ROLLBACK");
      return {
        status: "error",
        code: 400,
        message: "One or more products no longer exist",
        data: null,
      };
    }

    const totalPrice = cartItems.rows.reduce((total, item) => {
      return total + item.quantity * item.price_at_purchase;
    }, 0);

    const order = await pool.query(
      `INSERT INTO orders.orders (user_id, total_price,shipping_address,payment_method, created_at)
       VALUES ($1, $2, $3,$4,NOW())
       RETURNING id`,
      [userId, totalPrice, address, paymentMethod],
    );

    const orderId = order.rows[0].id;

    for (const item of cartItems.rows) {
      await pool.query(
        `INSERT INTO orders.order_items
         (order_id, product_id, quantity, price_at_purchase)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.price_at_purchase],
      );
    }

    await pool.query("DELETE FROM orders.cart_items WHERE cart_id = $1", [
      cartId,
    ]);

    await pool.query("COMMIT");

    return {
      status: "success",
      code: 201,
      message: "Order created successfully",
      data: { order_id: orderId, total_price: totalPrice },
    };
  } catch (error) {
    console.info(error);
    await pool.query("ROLLBACK");
    return {
      status: "error",
      code: 400,
      message: "Failed create order",
      data: null,
    };
  }
};
