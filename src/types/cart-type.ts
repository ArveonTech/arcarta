export interface DataReturn {
  status: "success" | "error";
  code: number;
  message: string;
  data: object | null;
}
