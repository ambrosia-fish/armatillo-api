class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = {
  handleError: (err, res) => {
    const statusCode = err.statusCode || 500;
    const response = {
      status: err.status || 'error',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack
      })
    };

    console.error(`[${new Date().toISOString()}] ${err.message}`, {
      status: statusCode,
      stack: err.stack
    });

    res.status(statusCode).json(response);
  },

  createError: (message, statusCode = 500) => {
    return new AppError(message, statusCode);
  },

  globalErrorMiddleware: (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    errorHandler.handleError(err, res);
  }
};

module.exports = {
  AppError,
  errorHandler
};
