// src/server.js
import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import cookieParser from "cookie-parser";

//Middlewares
import { errors } from 'celebrate';
import { connectMongoDB } from './db/connectMongoDB.js';
import { logger } from './middleware/logger.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

import studentsRoutes from './routes/studentsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';

const app = express();
const PORT = process.env.PORT ?? 3030;

//Middleware  global
app.use(logger); //Logger middleware
app.use(express.json()); // Body parser middleware
app.use(cors()); // Enable CORS for all routes
app.use(cookieParser()); // Cookie parser middleware

// Routes
app.use(authRoutes);
app.use(studentsRoutes);
app.use(userRoutes);

// Handle 404 - Not Found
app.use(notFoundHandler);

// Celebrate error handler
app.use(errors());

// Handle errors
app.use(errorHandler);

// Connect to MongoDB
await connectMongoDB();

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
