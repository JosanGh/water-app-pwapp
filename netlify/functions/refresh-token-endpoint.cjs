const jwt = require('jsonwebtoken');

exports.handler = async (event, _context) => {
  // 1. Enforce strict POST request rules
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // 2. Extract and robustly parse cookies from request headers
  const cookieHeader = event.headers.cookie || event.headers.Cookie || '';
  const cookies = cookieHeader
    .split(';')
    .map(cookie => cookie.trim().split('='))
    .reduce((acc, [key, value]) => {
      if (key) acc[key] = decodeURIComponent(value || '');
      return acc;
    }, {});

  const refreshToken = cookies.pwa_refresh_token;

  if (!refreshToken) {
    return { 
      statusCode: 401, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Session expired. Please log in again." }) 
    };
  }

  try {
    const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    const ACCESS_SECRET = process.env.JWT_SECRET_TOKEN;

    if (!REFRESH_SECRET || !ACCESS_SECRET) {
      console.error("Critical: Server environment variables JWT_REFRESH_SECRET or JWT_SECRET_TOKEN are missing.");
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Internal server configuration error." })
      };
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
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-store" 
      },
      body: JSON.stringify({ accessToken: newAccessToken })
    };

  } catch (error) {
    console.error("Refresh processing failure:", error.message);

    // Differentiate between expired tokens vs invalid/forged signatures if needed, 
    // otherwise gracefully reject compromised/invalid tokens with 403.
    const errorMessage = error.name === 'TokenExpiredError' 
      ? "Refresh token has expired. Please log in again." 
      : "Invalid or compromised refresh token session.";

    return { 
      statusCode: 403, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: errorMessage }) 
    };
  }
};