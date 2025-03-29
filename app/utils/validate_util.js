const { validationResult } = require('express-validator');
const { sendResponse } = require('./response_util');

const validateResult = (req, res, next) => {
    try {
        validationResult(req).throw();
        return next();
    } catch (err) {
        const errors = err.array().map(error => ({
            field: error.path,
            message: error.msg
        }));
        return sendResponse(res, 400, 'error', 'Error de validación', { errors });
    }
};

module.exports = { validateResult };