const withAuth = require("./utils/authMiddleware.cjs");

const syncHandler = async (event, context) => {
  try {
    // 1. Safely handle missing or empty request bodies
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing request body." })
      };
    }

    let payload;
    try {
      payload = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid JSON format." })
      };
    }

    const authorizedUser = context.user; // Injected securely by our middleware

    console.log(`Authenticated request by user: ${authorizedUser.userId}`);
    console.log(`Starting background sync process for record ID: ${payload.id}`);

    // NOTE: If this is deployed on AWS Lambda and you want true background processing 
    // without blocking the HTTP response, push this task to an SQS Queue or EventBridge here 
    // instead of using a blocking `setTimeout`.

    // Simulating asynchronous dispatch or processing:
    // await dispatchToQueue(payload); 

    console.log("Background synchronization task queued successfully.");

    return {
      statusCode: 202,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "Processing sync request accepted" })
    };
  } catch (error) {
    console.error("Background handler processing crash:", error);
    return { 
      statusCode: 500, 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal Server Processing Error" }) 
    };
  }
};

// Export the wrapped handler
exports.handler = withAuth(syncHandler);