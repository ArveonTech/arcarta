interface PropsValidateUser {
  full_name: string;
  email: string;
  password: string;
}

export const validateUser = ({
  full_name,
  email,
  password,
}: PropsValidateUser) => {
  if (!full_name) return "Username is required";
  if (full_name.length < 3) return "Username must be at least 3 characters";

  if (!email) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Invalid email format";

  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[0-9]/.test(password))
    return "Password must contain at least one number";
  if (!/[A-Za-z]/.test(password))
    return "Password must contain at least one letter";
  if (!/[A-Z]/.test(password))
    return "Password must contain at least one uppercase letter";
};

export const validatePassword = (password: string) => {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[0-9]/.test(password))
    return "Password must contain at least one number";
  if (!/[A-Za-z]/.test(password))
    return "Password must contain at least one letter";
  if (!/[A-Z]/.test(password))
    return "Password must contain at least one uppercase letter";
};
