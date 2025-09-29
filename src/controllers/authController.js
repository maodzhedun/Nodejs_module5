// src/controllers/authController.js

import bcrypt from "bcrypt";
import createHttpError from "http-errors";
import { User } from "../models/user.js";
// 1. Імпортуємо функцію setSessionCookies
import { createSession, setSessionCookies } from '../services/auth.js';
import { Session } from "../models/session.js";
// Імпортуємо jwt
import jwt from 'jsonwebtoken';
import { sendMail } from '../utils/sendMail.js';
// Імпортуємо handlebars, path та fs
import handlebars from 'handlebars';
import path from 'node:path';
import fs from 'node:fs/promises';


// Register a new user
export const registerUser = async (req, res, next) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(createHttpError(400, 'Email in use'));
  }

  // Хешуємо пароль
  const hashedPassword = await bcrypt.hash(password, 10);

  // Створюємо користувача
  const newUser = await User.create({
    email,
    password: hashedPassword,
  });

    // Створюємо нову сесію
    const newSession = await createSession(newUser._id);

      // 2. Викликаємо, передаємо об'єкт відповіді та сесію
  setSessionCookies(res, newSession);

  // Відправляємо дані користувача (без пароля) у відповіді
  res.status(201).json(newUser);
};


// Login an existing user
export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

	// Перевіряємо чи користувач з такою поштою існує
  const user = await User.findOne({ email });
  if (!user) {
    return next(createHttpError(401, 'User not found'));
  }

	// Порівнюємо хеші паролів
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return next(createHttpError(401, 'Invalid credentials'));
  }

    // Видаляємо стару сесію користувача
    await Session.deleteOne({ userId: user._id });

    // Створюємо нову сесію
    const newSession = await createSession(user._id);

      // 3. Викликаємо, передаємо об'єкт відповіді та сесію
  setSessionCookies(res, newSession);

  res.status(200).json(user);
};

// Logout a user
export const logoutUser = async (req, res) => {
  const { sessionId } = req.cookies;

  if (sessionId) {
    await Session.deleteOne({ _id: sessionId });
  }

  res.clearCookie('sessionId');
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.status(204).send();
};

// Refresh user session
export const refreshUserSession = async (req, res, next) => {
  // 1. Знаходимо поточну сесію за id сесії та рефреш токеном
  const session = await Session.findOne({
    _id: req.cookies.sessionId,
    refreshToken: req.cookies.refreshToken,
  });

  // 2. Якщо такої сесії нема, повертаємо помилку
  if (!session) {
    return next(createHttpError(401, 'Session not found'));
  }

  // 3. Якщо сесія існує, перевіряємо валідність рефреш токена
  const isSessionTokenExpired =
    new Date() > new Date(session.refreshTokenValidUntil);

  // Якщо термін дії рефреш токена вийшов, повертаємо помилку
  if (isSessionTokenExpired) {
    return next(createHttpError(401, 'Session token expired'));
  }

  // 4. Якщо всі перевірки пройшли добре, видаляємо поточну сесію
  await Session.deleteOne({
    _id: req.cookies.sessionId,
    refreshToken: req.cookies.refreshToken,
  });

  // 5. Створюємо нову сесію та додаємо кукі
  const newSession = await createSession(session.userId);
  setSessionCookies(res, newSession);

  res.status(200).json({
    message: 'Session refreshed',
  });
};

// Request password reset email
export const requestResetEmail = async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  // Якщо користувача нема — навмисно повертаємо ту саму "успішну"
  // відповідь без відправлення листа (anti user enumeration).
  if (!user) {
    return res.status(200).json({
      message: 'If this email exists, a reset link has been sent',
    });
  }

	// Користувач є — генеруємо короткоживучий JWT і відправляємо лист
  const resetToken = jwt.sign(
    { sub: user._id, email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' },
  );

  	// 1. Формуємо шлях до шаблона
    const templatePath = path.resolve('src/templates/reset-password-email.html');
    // 2. Читаємо шаблон
    const templateSource = await fs.readFile(templatePath, 'utf-8');
    // 3. Готуємо шаблон до заповнення
    const template = handlebars.compile(templateSource);
    // 4. Формуємо із шаблона HTML документ з динамічними даними
    const html = template({
      name: user.username,
      link: `${process.env.FRONTEND_DOMAIN}/reset-password?token=${resetToken}`,
    });

  try {
    await sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Reset your password',
    // 5. Передаємо HTML у функцію надписання пошти
    html,
    });
  } catch {
    next(createHttpError(500, 'Failed to send the email, please try again later.'));
    return;
  }

	// Та сама "нейтральна" відповідь
  res.status(200).json({
    message: 'If this email exists, a reset link has been sent',
  });
};

// Reset user password
export const resetPassword = async (req, res, next) => {
	const { token, password } = req.body;

	// 1. Перевіряємо/декодуємо токен
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
	  // Повертаємо помилку якщо проблема при декодуванні
    next(createHttpError(401, 'Invalid or expired token'));
    return;
  }

  // 2. Шукаємо користувача
  const user = await User.findOne({  _id: payload.sub,  email: payload.email });
  if (!user) {
    next(createHttpError(404, 'User not found'));
    return;
  }

  // 3. Якщо користувач існує
  // створюємо новий пароль і оновлюємо користувача
  const hashedPassword = await bcrypt.hash(password, 10);
  await User.updateOne(
	  { _id: user._id },
	  { password: hashedPassword }
  );

  // 4. Інвалідовуємо всі можливі попередні сесії користувача
  await Session.deleteMany({ userId: user._id });

	// 5. Повертаємо успішну відповідь
  res.status(200).json({
    message: 'Password reset successfully. Please log in again.',
  });
};