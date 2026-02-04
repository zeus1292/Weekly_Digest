import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, schema } from "./db";
import { eq } from "drizzle-orm";
import { registerSchema, loginSchema } from "../shared/schema";
import type { Request, Response } from "express";

// Extend Express session types
declare module "express-session" {
  interface SessionData {
    userId?: string;
    email?: string;
  }
}

const router = Router();

// POST /api/auth/register - Create new user account
router.post("/register", async (req: Request, res: Response) => {
  if (!db) {
    res.status(503).json({ error: "Authentication disabled (no database configured)" });
    return;
  }

  try {
    // Validate request body
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation error",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = result.data;

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await db
      .insert(schema.users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
      })
      .returning({
        id: schema.users.id,
        email: schema.users.email,
        createdAt: schema.users.createdAt,
      });

    // Set session
    req.session.userId = newUser.id;
    req.session.email = newUser.email;

    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      createdAt: newUser.createdAt?.toISOString(),
    });
  } catch (error) {
    console.error("[Auth] Registration error:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// POST /api/auth/login - Login with email/password
router.post("/login", async (req: Request, res: Response) => {
  if (!db) {
    res.status(503).json({ error: "Authentication disabled (no database configured)" });
    return;
  }

  try {
    // Validate request body
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: "Validation error",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = result.data;

    // Find user
    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Set session
    req.session.userId = user.id;
    req.session.email = user.email;

    res.json({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt?.toISOString(),
    });
  } catch (error) {
    console.error("[Auth] Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
});

// POST /api/auth/logout - Clear session
router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("[Auth] Logout error:", err);
      res.status(500).json({ error: "Logout failed" });
      return;
    }

    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

// GET /api/auth/me - Get current user (or null)
router.get("/me", async (req: Request, res: Response) => {
  // If no database, return null user but still provide session
  if (!db) {
    res.json({ user: null, sessionId: req.session.id, message: "Auth disabled (no database)" });
    return;
  }

  try {
    if (!req.session.userId) {
      res.json({ user: null, sessionId: req.session.id });
      return;
    }

    // Fetch user from database
    const [user] = await db
      .select({
        id: schema.users.id,
        email: schema.users.email,
        createdAt: schema.users.createdAt,
      })
      .from(schema.users)
      .where(eq(schema.users.id, req.session.userId))
      .limit(1);

    if (!user) {
      // User was deleted, clear session
      req.session.userId = undefined;
      req.session.email = undefined;
      res.json({ user: null, sessionId: req.session.id });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt?.toISOString(),
      },
      sessionId: req.session.id,
    });
  } catch (error) {
    console.error("[Auth] Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

export const authRouter = router;

// Middleware to require authentication
export function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.session.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

// Middleware to get current user (optional auth)
export function optionalAuth(req: Request, _res: Response, next: () => void) {
  // Session is automatically loaded, just continue
  next();
}
