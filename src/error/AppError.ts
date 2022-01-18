class AppError extends Error {
  public readonly name: string;
  public readonly httpCode: number;
  public readonly isOperational: boolean;

  constructor(
    name: string,
    description: string,
    isOperational: boolean,
    httpCode?: number
  ) {
    super(description);

    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain

    this.name = name;
    this.httpCode = httpCode ?? 500;
    this.isOperational = isOperational;

    Error.captureStackTrace(this);
  }
}

export default AppError;
