interface propsError {
  message: string;
  statusCode: number;
}

class Template extends Error {
  statusCode: number;

  constructor({ message, statusCode }: propsError) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class DatabaseError extends Template {}
export class AuthError extends Template {}
export class UserError extends Template {}
export class ProductError extends Template {}
