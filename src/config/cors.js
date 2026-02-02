// CORS configuration that allows both the web app and the Chrome extension
// to reach the API. Extension origins look like "chrome-extension://<id>".

function getCorsOptions() {
  const raw = process.env.CORS_ORIGINS || "";
  const allowedOrigins = raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin) ||
        origin.startsWith("chrome-extension://")
      ) {
        return callback(null, true);
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  };
}

module.exports = { getCorsOptions };
