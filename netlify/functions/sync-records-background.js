// netlify/functions/sync-records-background.js
const withAuth = require("./utils/authMiddleware");

const syncHandler = async (event, context) => {
  try {
    const payload = JSON.parse(event.body);
    const authorizedUser = context.user; // Injected securely by our middleware

    console.log(`Authenticated request by user: ${authorizedUser.userId}`);
    console.log(`Starting background sync process for record ID: ${payload.id}`);

    // Your data processing logic goes here...
    await new Promise((resolve) => setTimeout(resolve, 3000)); 

    console.log("Background synchronization completed safely.");
    
    return {
      statusCode: 202,
      body: JSON.stringify({ status: "Processing sync request" })
    };
  } catch (error) {
    console.error("Background handler processing crash:", error);
    return { statusCode: 500, body: "Internal Server Processing Error" };
  }
};

// Export the wrapped handler
exports.handler = withAuth(syncHandler);
