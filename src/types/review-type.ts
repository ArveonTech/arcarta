export interface Reviews {
  id: number;
  product_id: number;
  user_id: number;
  review_text: string;
  rating: number;
  created_at: Date;
  updated_at: Date;
}

export interface DataReturn {
  status: "success" | "error";
  code: number;
  message: string;
  data: {
    review: Reviews;
  } | null;
}
