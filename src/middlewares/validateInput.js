const { AppError } = require('../utils/errorHandler');

const validateInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      const message = error.details.map((detail) => detail.message).join(', ');
      throw new AppError(message, 400);
    }

    req.body = value;
    next();
  };
};

module.exports = validateInput;
