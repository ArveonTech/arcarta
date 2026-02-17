export interface User {
  id: string;
  password: string;
  email: string;
  is_verified: boolean;
  role: string;
  secret: string;
  created_at: Date;
  updated_at: Date;
}

export interface JWTPayload {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar: string;
}

export interface Profile {
  user_id: number;
  full_name: string;
  avatar: string;
}

export interface GoogleUserData {
  email?: string | null;
  name?: string | null;
  picture?: string | null;
}

export type DataFromGoogle = {
  email: string | null | undefined;
  name: string | null | undefined;
};

export type DataUserSetPassword = {
  status: "register";
  user: {
    email: string;
    full_name: string;
    password: string;
  };
};

export interface AuthenticateGoogleUserReturn {
  status: "login" | "register" | "failed";
  data:
    | { email: string; full_name: string }
    | { user: User; profile: Profile }
    | null;
}

export interface ValidateDataReturn {
  status: "success" | "error" | "pending";
  code: number;
  message: string;
  data: {
    user: User;
    profile: Profile;
  } | null;
}

export type DataUserRegister = {
  email: string;
  full_name: string;
  password: string;
};
