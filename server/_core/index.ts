import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import pinoHttp from "pino-http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { logger } from "./logger";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => { const server = net.createServer(); server.listen(port, () => server.close(() => resolve(true))); server.on("error", () => resolve(false)); });
}
async function findAvailablePort(startPort = 3000): Promise<number> { for (let port = startPort; port < startPort + 20; port++) if (await isPortAvailable(port)) return port; throw new Error(`No available port found starting from ${startPort}`); }

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.use(pinoHttp({ logger, customLogLevel: (_req, res, err) => err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info" }));
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext, onError: ({ path, error, ctx }) => { ctx?.req.log?.error({ err: error, trpcPath: path }, "tRPC request failed"); } }));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => { logger.error({ err: error }, "Unhandled server exception"); res.status(500).json({ error: "Something went wrong. Please try again." }); });
  if (process.env.NODE_ENV === "development") await setupVite(app, server); else serveStatic(app);
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) logger.warn({ preferredPort, port }, "Preferred port unavailable");
  server.listen(port, () => logger.info({ port }, "Notes app server started"));
}
startServer().catch(error => { logger.fatal({ err: error }, "Failed to start server"); process.exit(1); });
