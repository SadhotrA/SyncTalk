import jwt from "jsonwebtoken";

export const generateToken = (res, userId) => {

  const token = jwt.sign({ userId }, process.env.JWT_SECRET, { 
    expiresIn: "7d" 
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "lax", // Changed from "strict" to "lax" to allow cross-site requests
  });
  return token;
};
