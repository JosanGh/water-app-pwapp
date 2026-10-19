const jwt = require('jsonwebtoken');

const withAuth = (handler) => {
  return async (event, context) => {
    // 1. Enforce strict POST request rules
    if (event.httpMethod !== "POST") {
      return { 
        statusCode: 405, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method Not Allowed" }) 
      };
    }

    // 2. Normalize headers to lower-case keys safely to prevent casing mismatches
    const headers = event.headers || {};
    const authHeader = headers.authorization || headers.Authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { 
        statusCode: 401, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Unauthorized. Missing token." }) 
      };
    }

    // Split "Bearer <token>" to extract the token string
    const token = authHeader.split(" ")[1]; 

    try {
      const SECRET_KEY = process.env.JWT_SECRET_TOKEN;
      if (!SECRET_KEY) {
        console.error("Critical Error: JWT_SECRET_TOKEN environment variable is missing.");
        return {
          statusCode: 500,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Internal server configuration error." })
        };
      }

      // Verify token authenticity and expiration
      const decodedUser = jwt.verify(token, SECRET_KEY); 
      
      // Attach the validated user details directly to context
      context.user = decodedUser;

      return await handler(event, context);
      
    } catch (error) {
      console.log("Auth Verification Failure Name:", error.name);
      console.error("Auth Failure Message:", error.message);
      
      // Explicitly handle JWT errors vs generic errors
      if (error.name === 'TokenExpiredError') {
        return { 
          statusCode: 401, 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "TokenExpired" }) 
        };
      } 

      if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
        return { 
          statusCode: 401, 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Malformed or invalid token signature" }) 
        };
      }

      // Catch-all for unexpected runtime errors inside the try block
      return { 
        statusCode: 500, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Internal server authentication error" }) 
      };
    }
  };
};

module.exports = withAuth;
