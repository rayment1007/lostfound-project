function notFound(req, res) {
  res.status(404).json({ error: "Not Found" });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.statusCode || 500;
  const message = status === 500 ? "Server Error" : err.message;

  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };