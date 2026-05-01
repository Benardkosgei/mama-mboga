import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { mpesaRouter } from './routes/mpesa.js';
import { healthRouter } from './routes/health.js';
import { errorHandler } from './middleware/error.js';

config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/health', healthRouter);
app.use('/api/mpesa', mpesaRouter);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 M-Pesa Middleware running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
