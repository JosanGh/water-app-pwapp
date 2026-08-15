// netlify/functions/refresh-token-endpoint.js
const jwt = require('jsonwebtoken');

exports.handler = async (event, context) => {
  // 1. Enforce strict POST request rules
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // 2. Extract cookies from request headers
  const cookieHeader = event.headers.cookie || event.headers.Cookie || '';
  const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
  const refreshToken = cookies.pwa_refresh_token; // The browser sends this automatically

  if (!refreshToken) {
    return { 
      statusCode: 401, 
      body: JSON.stringify({ error: "Session expired. Please log in again." }) 
    };
  }

  try {
    const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    const ACCESS_SECRET = process.env.JWT_SECRET_TOKEN;

    if (!REFRESH_SECRET || !ACCESS_SECRET) {
      throw new Error("Server environment variables are misconfigured.");
    }

    // 3. Verify the validity of the refresh token signature
    const decodedUser = jwt.verify(refreshToken, REFRESH_SECRET);

    // 4. Generate a brand new access token valid for 15 minutes
    const newAccessToken = jwt.sign(
      { userId: decodedUser.userId, role: decodedUser.role }, 
      ACCESS_SECRET, 
      { expiresIn: '15m' }
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: newAccessToken })
    };

  } catch (error) {
    console.error("Refresh processing failure:", error.message);
    return { 
      statusCode: 403, 
      body: JSON.stringify({ error: "Invalid or compromised refresh token session." }) 
    };
  }
};
