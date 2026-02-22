import path from "path";
import { pool } from "../database/db";
import { DataReturn, Product } from "../types/product-types";
import fs from "fs/promises";

type ProductFilters = {
  title?: string;
  price?: number;
  category?: string;
};

export const getAllProducts = async (
  filters: ProductFilters,
): Promise<Product[]> => {
  const conditions: string[] = [];
  const values: any[] = [];

  if (filters.title) {
    values.push(`%${filters.title}%`);
    conditions.push(`p.name ILIKE $${values.length}`);
  }

  if (filters.price) {
    values.push(filters.price);
    conditions.push(`p.price = $${values.length}`);
  }

  if (filters.category) {
    values.push(filters.category);
    conditions.push(`p.category = $${values.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT
      p.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', i.id,
            'src', i.src
          )
        ) FILTER (WHERE i.id IS NOT NULL),
        '[]'
      ) AS images
    FROM catalog.products p
    LEFT JOIN catalog.images i
      ON i.product_id = p.id
    ${whereClause}
    GROUP BY p.id
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

export const getProductById = async (id: number): Promise<Product> => {
  const query = `
    SELECT
      p.*,
      (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'src', i.src
            )
          ),
          '[]'
        )
        FROM catalog.images i
        WHERE i.product_id = p.id
      ) AS images,
      (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', r.id,
              'review_text', r.review_text,
              'rating', r.rating,
              'created_at', r.created_at,
              'user', json_build_object(
                'id', u.id,
                'email', u.email
              )
            )
          ),
          '[]'
        )
        FROM catalog.reviews r
        LEFT JOIN auth.users u
          ON u.id = r.user_id
        WHERE r.product_id = p.id
      ) AS reviews,
      (
        SELECT COALESCE(AVG(r.rating), 0)
        FROM catalog.reviews r
        WHERE r.product_id = p.id
      ) AS avg_rating,
      (
        SELECT COUNT(*)
        FROM catalog.reviews r
        WHERE r.product_id = p.id
      ) AS total_reviews

    FROM catalog.products p
    WHERE p.id = $1
  `;

  const result = await pool.query(query, [id]);

  return result.rows[0];
};

export const createProduct = async (
  data: {
    name: string;
    price: number;
    category_id: number;
    description: string;
  },
  imagePath?: string | undefined,
): Promise<DataReturn> => {
  try {
    await pool.query("BEGIN");

    const result = await pool.query<Product>(
      `INSERT INTO catalog.products (name, price, category_id, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.name, data.price, data.category_id, data.description],
    );

    const product = result.rows[0];
    if (!product)
      return {
        status: "error",
        code: 400,
        message: "Failed to add product",
        data: null,
      };

    if (imagePath) {
      await pool.query(
        `INSERT INTO catalog.images (product_id, src) VALUES ($1, $2)`,
        [product.id, imagePath],
      );
    }

    await pool.query("COMMIT");

    return {
      status: "success",
      code: 200,
      message: "Product added successfully",
      data: { product },
    };
  } catch (error: any) {
    await pool.query("ROLLBACK");

    if (imagePath) await fs.unlink(imagePath).catch(() => {});

    return {
      status: "error",
      code: 500,
      message: error.message || "Failed to add product",
      data: null,
    };
  }
};

export const updateProduct = async (
  id: number,
  data: {
    name: string;
    price: number;
    category_id: number;
    description: string;
  },
): Promise<Product> => {
  const result = await pool.query(
    `UPDATE catalog.products
     SET name = $1, price = $2, category_id=$3, description=$4 updated_at=NOW()
     WHERE id = $5
     RETURNING *`,
    [data.name, data.price, data.category_id, data.description, id],
  );

  return result.rows[0];
};

export const deleteProduct = async (id: number): Promise<DataReturn> => {
  try {
    await pool.query("BEGIN");

    const imageResult = await pool.query(
      "SELECT * FROM catalog.images WHERE product_id = $1",
      [id],
    );

    if (imageResult.rows[0]) {
      const imagePath = path.join(process.cwd(), imageResult.rows[0].src);
      await fs.unlink(imagePath).catch(() => {});
    }

    await pool.query("DELETE FROM catalog.images WHERE product_id = $1", [id]);

    const productDelete = await pool.query(
      "DELETE FROM catalog.products WHERE id = $1",
      [id],
    );

    if (productDelete.rowCount === 0) throw new Error("Failed delete product");

    await pool.query("COMMIT");

    return {
      status: "success",
      code: 200,
      message: "Product deleted successfully",
      data: null,
    };
  } catch (error: any) {
    await pool.query("ROLLBACK");

    return {
      status: "error",
      code: 500,
      message: error.message || "Failed to delete product",
      data: null,
    };
  }
};
