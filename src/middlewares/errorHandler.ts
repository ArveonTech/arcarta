interface propsError {
  message: string;
  statusCode: number;
  isOperational?: boolean;
}

class Template extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor({ message, statusCode }: propsError) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export class DatabaseError extends Template {}
export class AuthError extends Template {}
