import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { config } from './config/index.js';
import { authRouter, classRouter } from './routes/auth.js';
import professorRouter from './routes/professor.js';
import studentRouter from './routes/student.js';
import taRouter from './routes/ta.js';
import { errorHandler } from './middleware/errorHandler.js';
import { autoExpireSessions } from './services/sessionService.js';
import { error } from './utils/apiResponse.js';

const app = express();

app.use(
  cors({
    origin: config.corsOrigins === '*' ? true : config.corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'SecureAttend Node API' });
});

app.use('/api/auth', authRouter);
app.use('/api/professor/classes', classRouter);
app.use('/api/professor', professorRouter);
app.use('/api/student', studentRouter);
app.use('/api/ta', taRouter);

app.use((req, res) => {
  res.status(404).json(error(`Route not found: ${req.method} ${req.path}`, 'NOT_FOUND'));
});

app.use(errorHandler);

async function start() {
  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('✓ Connected to MongoDB');

    setInterval(() => {
      autoExpireSessions().catch(console.error);
    }, 5 * 60 * 1000);

    app.listen(config.port, () => {
      console.log(`✓ SecureAttend API running on port ${config.port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    if (err.code === 'ENOTFOUND') {
      console.error('\nMongoDB hostname could not be resolved.');
      console.error('→ Check MONGODB_URI in backend/secureattend-node/.env');
      console.error('→ In MongoDB Atlas: Database → Connect → copy a fresh connection string');
      console.error('→ Ensure the cluster is running and your IP is allowed in Network Access\n');
    }
    process.exit(1);
  }
}

start();
