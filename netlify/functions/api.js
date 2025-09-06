// Import required dependencies
const express = require("express");
const serverless = require("serverless-http");
const path = require("path");
const fs = require("fs");

// Create an Express app as a fallback
const app = express();

const UPLOAD_DIR = "/tmp/uploads"; // writable
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Try to load the built application
let mainApp;
try {
  // Check if the built file exists
  if (fs.existsSync(path.resolve(__dirname, "../../dist/index.js"))) {
    // Import the app
    const importedApp = require("../../dist/index.js");
    mainApp = importedApp.default || importedApp;

    if (
      mainApp &&
      typeof mainApp === "function" &&
      mainApp.use &&
      mainApp.listen
    ) {
      console.log("Successfully loaded the main application");
    } else {
      throw new Error("Imported object is not an Express app");
    }
  } else {
    throw new Error("dist/index.js does not exist");
  }
} catch (error) {
  console.error("Failed to load main application:", error.message);

  // Set up fallback routes
  app.get("/.netlify/functions/api", (req, res) => {
    res.json({
      status: "error",
      message: "API is in fallback mode",
      error: error.message,
    });
  });

  app.get("*", (req, res) => {
    res.json({
      status: "error",
      message:
        "Failed to load the main application. Please check build process.",
    });
  });

  mainApp = app;
}

// Export the handler function
module.exports.handler = serverless(mainApp);
