const crypto = require("node:crypto");
const path = require("node:path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");

const app = express();
const port = Number(process.env.PORT || 4000);
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const cookieName = "northstar_session";
const sessionDurationSeconds = 60 * 60 * 8;
const jwtSecret = process.env.JWT_SECRET;
const isProduction = process.env.NODE_ENV === "production";
const demoEmail = (process.env.DEMO_EMAIL || "admin@northstar.io").trim().toLowerCase();
const demoPassword = process.env.DEMO_PASSWORD || "northstar-demo-2026";

if (!jwtSecret || Buffer.byteLength(jwtSecret) < 32) {
  throw new Error("Set JWT_SECRET to a random value at least 32 bytes long in backend/.env.");
}
if (isProduction && (demoEmail === "admin@northstar.io" || demoPassword === "northstar-demo-2026")) {
  throw new Error("Set unique DEMO_EMAIL and DEMO_PASSWORD values before running in production.");
}

const roles = new Set(["Admin", "Member", "Viewer"]);
const statuses = new Set(["Active", "Invited", "Suspended"]);
const users = [
  ["u_1001", "Olivia Chen", "olivia@northstar.io", "Admin", "Active", "2024-01-14"],
  ["u_1002", "Marcus Johnson", "marcus@northstar.io", "Member", "Active", "2024-02-08"],
  ["u_1003", "Sofia Ramirez", "sofia@northstar.io", "Member", "Active", "2024-02-21"],
  ["u_1004", "Liam Patel", "liam@northstar.io", "Viewer", "Active", "2024-03-05"],
  ["u_1005", "Amara Okafor", "amara@northstar.io", "Member", "Invited", "2024-03-19"],
  ["u_1006", "Ethan Williams", "ethan@northstar.io", "Admin", "Active", "2024-04-02"],
  ["u_1007", "Isabella Kim", "isabella@northstar.io", "Member", "Active", "2024-04-16"],
  ["u_1008", "Noah Thompson", "noah@northstar.io", "Viewer", "Invited", "2024-05-01"],
  ["u_1009", "Maya Fischer", "maya@northstar.io", "Member", "Active", "2024-05-14"],
  ["u_1010", "Lucas Anderson", "lucas@northstar.io", "Member", "Suspended", "2024-06-10"],
  ["u_1011", "Zara Ahmed", "zara@northstar.io", "Viewer", "Active", "2024-07-03"],
  ["u_1012", "Theo Martin", "theo@northstar.io", "Member", "Active", "2024-07-25"]
].map(([id, name, email, role, status, joinedAt]) => ({ id, name, email, role, status, joinedAt }));

const revenue = [
  { label: "Jan", value: 38 }, { label: "Feb", value: 47 }, { label: "Mar", value: 42 },
  { label: "Apr", value: 58 }, { label: "May", value: 52 }, { label: "Jun", value: 69 },
  { label: "Jul", value: 61 }, { label: "Aug", value: 78 }, { label: "Sep", value: 73 },
  { label: "Oct", value: 91 }, { label: "Nov", value: 84 }, { label: "Dec", value: 103 }
];
const activity = [
  { label: "Mon", value: 42 }, { label: "Tue", value: 65 }, { label: "Wed", value: 51 },
  { label: "Thu", value: 80 }, { label: "Fri", value: 59 }, { label: "Sat", value: 36 },
  { label: "Sun", value: 48 }
];
const loginAttempts = new Map();

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const content = `${header}.${body}`;
  return `${content}.${crypto.createHmac("sha256", jwtSecret).update(content).digest("base64url")}`;
}

function verify(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const expected = crypto.createHmac("sha256", jwtSecret).update(`${parts[0]}.${parts[1]}`).digest();
  let actual;
  let header;
  let payload;
  try {
    actual = Buffer.from(parts[2], "base64url");
    header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (header.alg !== "HS256" || actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
  if (typeof payload.sub !== "string" || !Number.isInteger(payload.exp) || payload.exp <= Date.now() / 1000) return null;
  return payload;
}

function sendError(res, status, message) {
  res.status(status).json({ error: { message } });
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((item) => {
    const separator = item.indexOf("=");
    if (separator < 0) return ["", ""];
    return [item.slice(0, separator).trim(), item.slice(separator + 1).trim()];
  }));
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: sessionDurationSeconds * 1000
  };
}

app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cache-Control", "no-store");

  const origin = req.get("origin");
  if (origin && origin !== frontendOrigin) {
    return sendError(res, 403, "This origin is not allowed.");
  }
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", frontendOrigin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.sendStatus(204);
  }
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method) && origin !== frontendOrigin) {
    return sendError(res, 403, "A valid application origin is required.");
  }
  return next();
});
app.use(express.json({ limit: "16kb", strict: true }));

function requireSession(req, res, next) {
  const token = parseCookies(req.headers.cookie)[cookieName];
  const session = token && verify(token);
  if (!session) {
    res.clearCookie(cookieName, { ...cookieOptions(), maxAge: undefined });
    return sendError(res, 401, "Your session has expired. Please sign in again.");
  }
  req.session = session;
  return next();
}

function validateUser(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return "Provide valid user details.";
  const { name, email, role, status } = body;
  if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 80) {
    return "Name must be between 2 and 80 characters.";
  }
  if (typeof email !== "string" || email.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return "Enter a valid email address.";
  }
  if (!roles.has(role)) return "Choose a valid role.";
  if (!statuses.has(status)) return "Choose a valid status.";
  return null;
}

function safeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status, joinedAt: user.joinedAt };
}

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.post("/api/auth/login", (req, res) => {
  const address = req.ip || "unknown";
  const now = Date.now();
  const attempt = loginAttempts.get(address);
  if (attempt && now - attempt.startedAt < 15 * 60 * 1000 && attempt.count >= 10) {
    return sendError(res, 429, "Too many sign-in attempts. Please wait 15 minutes and try again.");
  }

  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!safeEqual(email, demoEmail) || !safeEqual(password, demoPassword)) {
    const count = attempt && now - attempt.startedAt < 15 * 60 * 1000 ? attempt.count + 1 : 1;
    loginAttempts.set(address, { startedAt: attempt?.startedAt && now - attempt.startedAt < 15 * 60 * 1000 ? attempt.startedAt : now, count });
    return sendError(res, 401, "That email and password combination wasn’t recognized.");
  }

  loginAttempts.delete(address);
  const user = { name: "Jordan Davis", email: demoEmail, role: "Admin" };
  const token = sign({ sub: user.email, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + sessionDurationSeconds });
  res.cookie(cookieName, token, cookieOptions());
  return res.json({ user });
});

app.post("/api/auth/logout", requireSession, (_req, res) => {
  res.clearCookie(cookieName, { ...cookieOptions(), maxAge: undefined });
  return res.json({ message: "Signed out successfully." });
});

app.get("/api/auth/me", requireSession, (req, res) => {
  return res.json({ user: { name: "Jordan Davis", email: req.session.sub, role: "Admin" } });
});

app.get("/api/users", requireSession, (_req, res) => res.json({ users: users.map(safeUser) }));

app.post("/api/users", requireSession, (req, res) => {
  const validationError = validateUser(req.body);
  if (validationError) return sendError(res, 400, validationError);
  const email = req.body.email.trim().toLowerCase();
  if (users.some((user) => user.email.toLowerCase() === email)) return sendError(res, 409, "A workspace member with that email already exists.");
  const user = {
    id: `u_${crypto.randomUUID()}`,
    name: req.body.name.trim(),
    email,
    role: req.body.role,
    status: req.body.status,
    joinedAt: new Date().toISOString()
  };
  users.unshift(user);
  return res.status(201).json({ user: safeUser(user) });
});

app.put("/api/users/:id", requireSession, (req, res) => {
  const validationError = validateUser(req.body);
  if (validationError) return sendError(res, 400, validationError);
  const user = users.find((entry) => entry.id === req.params.id);
  if (!user) return sendError(res, 404, "That workspace member could not be found.");
  const email = req.body.email.trim().toLowerCase();
  if (users.some((entry) => entry.id !== user.id && entry.email.toLowerCase() === email)) {
    return sendError(res, 409, "A workspace member with that email already exists.");
  }
  Object.assign(user, { name: req.body.name.trim(), email, role: req.body.role, status: req.body.status });
  return res.json({ user: safeUser(user) });
});

app.delete("/api/users/:id", requireSession, (req, res) => {
  const index = users.findIndex((user) => user.id === req.params.id);
  if (index === -1) return sendError(res, 404, "That workspace member could not be found.");
  users.splice(index, 1);
  return res.json({ message: "Workspace member removed." });
});

app.get("/api/metrics", requireSession, (_req, res) => {
  return res.json({
    metrics: {
      totalUsers: users.length,
      activeSubscriptions: 248,
      mrr: 24860,
      conversionRate: 3.6,
      revenue,
      activity
    }
  });
});

app.use((error, _req, res, _next) => {
  console.error("Unhandled API error:", error);
  if (res.headersSent) return;
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return sendError(res, 400, "Request body must be valid JSON.");
  }
  return sendError(res, 500, "An unexpected server error occurred.");
});

if (require.main === module) {
  app.listen(port, () => console.log(`Northstar API listening on http://localhost:${port}`));
}

module.exports = app;
