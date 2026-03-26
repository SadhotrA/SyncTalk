import { body, param, query, validationResult } from "express-validator";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: errors.array()[0].msg 
    });
  }
  next();
};

export const signupValidation = [
  body("fullName")
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters"),
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please enter a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  validate
];

export const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please enter a valid email"),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
  validate
];

export const messageValidation = [
  body("text")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Message must be less than 1000 characters"),
  validate
];

export const conversationIdValidation = [
  param("conversationId")
    .isMongoId()
    .withMessage("Invalid conversation ID"),
  validate
];

export const userIdValidation = [
  param("userId")
    .isMongoId()
    .withMessage("Invalid user ID"),
  validate
];

export const messageIdValidation = [
  param("messageId")
    .isMongoId()
    .withMessage("Invalid message ID"),
  validate
];

export const searchValidation = [
  query("query")
    .trim()
    .isLength({ min: 2 })
    .withMessage("Search query must be at least 2 characters"),
  validate
];