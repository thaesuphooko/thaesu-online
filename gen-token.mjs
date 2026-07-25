import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'thaesu-secret-key-2024-prod-v2';

// Use TestUser2's id from earlier: "77dd0785-46f0-496a-8dee-1034854d7b1f"
const payload = {
  id: "77dd0785-46f0-496a-8dee-1034854d7b1f",
  email: null,
  role: "customer",
};

const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
console.log("Generated Token:", token);
