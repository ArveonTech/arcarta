import "express";

declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
      status?: "ok" | "refresh";
      refreshToken?: string;
      accessToken?: string;
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

export {};
