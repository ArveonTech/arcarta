import "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        avatar: string;
        email: string;
        full_name: string;
        role: string;
      };
    }
  }
}
