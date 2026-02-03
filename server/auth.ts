import { Express } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import { User as DbUser } from "@shared/schema";
import bcrypt from "bcryptjs";

// Extend Express User type
declare global {
  namespace Express {
    interface User extends DbUser {}
  }
}

export function setupAuth(app: Express) {
  // Session setup
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "rise_and_shine_secret",
      resave: false,
      saveUninitialized: false,
      store: storage.sessionStore,
      cookie: {
        secure: app.get("env") === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // Passport Configuration
  passport.use(
    new LocalStrategy(
      { usernameField: "institutionId" }, // Use institutionId instead of username
      async (institutionId, password, done) => {
        try {
          const user = await storage.getUserByInstitutionId(institutionId);
          if (!user) {
            return done(null, false, { message: "Invalid ID" });
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid password" });
          }

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || false);
    } catch (err) {
      done(err);
    }
  });

  // Auth Routes
  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: DbUser | false, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.logIn(user, (err) => {
        if (err) return next(err);
        return res.json({
          id: user.id,
          institutionId: user.institutionId,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
          rank: user.rank
        });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.json(null);
    }
    const user = req.user as DbUser;
    res.json({
      id: user.id,
      institutionId: user.institutionId,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      rank: user.rank
    });
  });
}
