/**
 * server/src/swagger.ts
 *
 * Builds the OpenAPI 3.0 specification from JSDoc comments on the route files.
 * Mount this in index.ts:
 *
 *   import { swaggerSpec, swaggerUiOptions } from "./swagger.js";
 *   import swaggerUi from "swagger-ui-express";
 *   app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
 */

import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "ReadShift API",
      version: "1.0.0",
      description:
        "REST API for the ReadShift adaptive reading comprehension platform. " +
        "All endpoints under /api/* require a Supabase JWT in the Authorization header " +
        "except /healthz and /health.",
      contact: {
        name: "ReadShift",
      },
    },
    servers: [
      { url: "http://localhost:3001", description: "Development" },
      { url: "https://readshift-backend.onrender.com", description: "Production (Render)" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Supabase access token",
        },
      },
      schemas: {
        ApiSuccess: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            data: { type: "object" },
          },
        },
        ApiError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: {
              type: "object",
              properties: {
                code: { type: "string", example: "NOT_FOUND" },
                message: { type: "string", example: "Resource not found" },
              },
            },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["ok", "degraded"] },
            uptime: { type: "number", example: 3600 },
            ts: { type: "string", format: "date-time" },
            checks: {
              type: "object",
              properties: {
                api: { type: "string" },
                database: { type: "string" },
                redis: { type: "string" },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Health", description: "Health check endpoints" },
      { name: "Users", description: "User management and preferences" },
      { name: "Sessions", description: "Reading session lifecycle" },
      { name: "Passages", description: "Passage retrieval" },
      { name: "Dashboard", description: "Aggregated stats and analytics" },
      { name: "Calibrations", description: "WPM calibration sessions" },
      { name: "Drills", description: "Speed drills" },
      { name: "Admin", description: "Admin-only operations" },
    ],
  },
  // Scan these files for @openapi JSDoc annotations
  apis: ["./src/routes/*.ts", "./src/routes/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);

export const swaggerUiOptions: Record<string, unknown> = {
  customSiteTitle: "ReadShift API Docs",
  swaggerOptions: {
    persistAuthorization: true,
    tryItOutEnabled: true,
  },
};
