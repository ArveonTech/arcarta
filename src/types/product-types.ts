export interface Product {
  id: number;
  name: string;
  price: number;
  category_id: string;
  description: string;
  image_url: string | null;
  created_at: Date;
}

export interface DataReturn {
  status: "success" | "error";
  code: number;
  message: string;
  data: {
    product: Product;
  } | null;
}
