import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { setupWebSocket } from "../websocket";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// FIX 4: CORS origin allowlist
const ALLOWED_ORIGINS = new Set([
  process.env.PRODUCTION_URL || "https://fitmonster.com",
  "http://localhost:3000",
  "http://localhost:8081",
  // Expo dev URLs
  ...(process.env.EXPO_DEV_URL ? [process.env.EXPO_DEV_URL] : []),
]);

// FIX 7: Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "TOO_MANY_REQUESTS" },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120,
  message: { error: "TOO_MANY_REQUESTS" },
});

const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: "ANALYZE_RATE_LIMIT_EXCEEDED" },
});

async function startServer() {
  const app = express();
  const server = createServer(app);

  // FIX 4: CORS with origin allowlist
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Credentials", "true");
    }
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  // FIX 7: Apply rate limiters (order matters — most specific first)
  app.use("/api/trpc/auth.", authLimiter);
  app.use("/api/trpc/foodLogs.analyze", analyzeLimiter);
  app.use("/api/trpc", apiLimiter);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  // Account deletion page (Google Play compliance)
  app.get("/api/delete-account", (_req, res) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(getDeleteAccountPage());
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Initialize WebSocket server
  setupWebSocket(server);

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);

function getDeleteAccountPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Delete Your FitMonster Account</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; line-height: 1.6; }
    .container { max-width: 640px; margin: 0 auto; padding: 40px 24px; }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo h1 { font-size: 28px; color: #22c55e; margin-top: 12px; }
    .logo p { color: #64748b; font-size: 14px; }
    .card { background: #fff; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; }
    h2 { font-size: 22px; margin-bottom: 16px; color: #0f172a; }
    h3 { font-size: 17px; margin-bottom: 12px; color: #334155; }
    p { margin-bottom: 12px; color: #475569; font-size: 15px; }
    .steps { padding-left: 0; list-style: none; counter-reset: step; }
    .steps li { counter-increment: step; padding: 12px 0 12px 48px; position: relative; border-bottom: 1px solid #f1f5f9; font-size: 15px; color: #475569; }
    .steps li:last-child { border-bottom: none; }
    .steps li::before { content: counter(step); position: absolute; left: 0; top: 12px; width: 32px; height: 32px; border-radius: 50%; background: #22c55e; color: #fff; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; }
    .data-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .data-table th, .data-table td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .data-table th { background: #f8fafc; color: #64748b; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .data-table td { color: #475569; }
    .warning { background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 16px 0; }
    .warning p { color: #991b1b; margin: 0; font-size: 14px; }
    .email-link { color: #22c55e; text-decoration: none; font-weight: 600; }
    .email-link:hover { text-decoration: underline; }
    .footer { text-align: center; padding: 24px 0; color: #94a3b8; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>FitMonster</h1>
      <p>Account Deletion Request</p>
    </div>

    <div class="card">
      <h2>How to Delete Your Account</h2>
      <p>You can delete your FitMonster account using either of the following methods:</p>

      <h3>Method 1: In-App Deletion</h3>
      <ol class="steps">
        <li>Open the FitMonster app and sign in to your account</li>
        <li>Tap the <strong>profile icon</strong> or navigate to <strong>Edit Profile</strong></li>
        <li>Scroll to the bottom of the page</li>
        <li>Tap <strong>"Delete Account"</strong></li>
        <li>Confirm the deletion when prompted</li>
      </ol>

      <h3>Method 2: Email Request</h3>
      <p>If you cannot access the app, you can request account deletion by sending an email to:</p>
      <p><a href="mailto:support@fitmonster.com" class="email-link">support@fitmonster.com</a></p>
      <p>Please include the email address associated with your FitMonster account. We will process your request within <strong>7 business days</strong>.</p>
    </div>

    <div class="card">
      <h2>What Data Gets Deleted</h2>
      <p>When you delete your account, the following data will be <strong>permanently removed</strong>:</p>
      <table class="data-table">
        <thead>
          <tr><th>Data Type</th><th>Action</th><th>Timeframe</th></tr>
        </thead>
        <tbody>
          <tr><td>Account credentials</td><td>Permanently deleted</td><td>Immediately</td></tr>
          <tr><td>Profile information (name, age, gender, etc.)</td><td>Permanently deleted</td><td>Immediately</td></tr>
          <tr><td>Monster collection and progress</td><td>Permanently deleted</td><td>Immediately</td></tr>
          <tr><td>Workout history and exercise logs</td><td>Permanently deleted</td><td>Immediately</td></tr>
          <tr><td>Food scan and nutrition logs</td><td>Permanently deleted</td><td>Immediately</td></tr>
          <tr><td>Battle history and records</td><td>Permanently deleted</td><td>Immediately</td></tr>
          <tr><td>Friend connections and chat messages</td><td>Permanently deleted</td><td>Immediately</td></tr>
          <tr><td>Daily stats and quest progress</td><td>Permanently deleted</td><td>Immediately</td></tr>
          <tr><td>Push notification tokens</td><td>Permanently deleted</td><td>Immediately</td></tr>
        </tbody>
      </table>

      <div class="warning">
        <p><strong>Warning:</strong> Account deletion is permanent and cannot be undone. All your monsters, workout history, food logs, and social connections will be lost forever. Please make sure you want to proceed before deleting your account.</p>
      </div>
    </div>

    <div class="card">
      <h2>Data Retention</h2>
      <p>After account deletion:</p>
      <p>All personal data is deleted <strong>immediately</strong> upon confirmation. We do not retain any user data after account deletion. Anonymized, aggregated analytics data that cannot be linked back to your account may be retained for service improvement purposes.</p>
    </div>

    <div class="card">
      <h2>Contact Us</h2>
      <p>If you have questions about account deletion or your data, please contact us:</p>
      <p>Email: <a href="mailto:support@fitmonster.com" class="email-link">support@fitmonster.com</a></p>
      <p>Privacy Policy: <a href="https://lokhanglaw-bot.github.io/fitmonster-support/privacy-policy.html" class="email-link">View Privacy Policy</a></p>
    </div>

    <div class="footer">
      <p>&copy; 2025 FitMonster. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}
