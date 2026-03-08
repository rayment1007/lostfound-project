const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { query } = require("../db");
const { validateRegister, validateLogin } = require("../validators/auth.validator");

async function register(req, res, next) {
  try {
    const v = validateRegister(req.body);
    if (!v.ok) {
      return res.status(400).json({ error: "Validation failed", details: v.errors });
    }

    const passwordHash = await bcrypt.hash(v.password, 12);

    const result = await query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
      [v.email, passwordHash]
    );

    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Email already registered" });
    }
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const v = validateLogin(req.body);
    if (!v.ok) {
      return res.status(400).json({ error: "Validation failed", details: v.errors });
    }

    const result = await query(
      "SELECT id, email, password_hash FROM users WHERE email=$1",
      [v.email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(v.password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      { sub: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login };