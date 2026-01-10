class ApiError extends Error {
  code: number;

  constructor(message: string, code: number = 500, stack = "", name = "") {
    super(message);
    this.code = code;
    if (name) {
      this.name = name;
    }
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export default ApiError;
