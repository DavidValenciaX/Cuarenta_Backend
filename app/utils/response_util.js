function sendResponse(res, statusCode, status, message, data) {
    const responseBody = { status, message };
    if (data) {
      responseBody.data = data;
    }
    return res.status(statusCode).json(responseBody);
  }
  
  module.exports = { sendResponse };
  