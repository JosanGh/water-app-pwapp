// netlify/functions/utils/authMiddleware.js
const jwt = require('jsonwebtoken');

const withAuth = (handler) => {
  return async (event, context) => {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const authHeader = event.headers.authorization || event.headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized. Missing token." }) };
    }

    // Split "Bearer <token>" to extract the token string
    const token = authHeader.split(" ")[1]; 

    try {
      const SECRET_KEY = process.env.JWT_SECRET_TOKEN;
      if (!SECRET_KEY) {
        throw new Error("Server misconfiguration: JWT_SECRET_TOKEN environment variable is missing.");
      }

      // Verify token authenticity and expiration
      const decodedUser = jwt.verify(token, SECRET_KEY); 
      
      // Attach the validated user details directly to context
      context.user = decodedUser;

      return await handler(event, context);
      
    } catch (error) {
      console.error("Auth Failure:", error.message);
      
      // Specifically inform frontend if token expired so it can attempt a refresh
      if (error.name === 'TokenExpiredError') {
        return { statusCode: 401, body: JSON.stringify({ error: "TokenExpired" }) };
      }
      
      return { statusCode: 403, body: JSON.stringify({ error: "Forbidden or invalid token" }) };
    }
  };
};

module.exports = withAuth;
