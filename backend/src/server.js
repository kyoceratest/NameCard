import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cardsRouter from './routes/cards.js';
import scanRouter from './routes/scan.js';
import dashboardRouter from './routes/dashboard.js';
import authRouter from './routes/auth.js';
import secureScansRouter from './routes/secureScans.js';
import secureDashboardRouter from './routes/secureDashboard.js';
import secureUsersRouter from './routes/secureUsers.js';
import secureCardsRouter from './routes/secureCards.js';
import { initDb } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// Serve shared images (e.g. logos) from the NameCard/image folder
// __dirname here is backend/src, so go two levels up to reach NameCard/image
const imageDir = path.resolve(__dirname, '../../image');
app.use('/image', express.static(imageDir));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/secure-scans', secureScansRouter);
app.use('/scan', scanRouter);
app.use('/dashboard', dashboardRouter);
app.use('/secure-dashboard', secureDashboardRouter);
app.use('/secure-users', secureUsersRouter);
app.use('/secure-cards', secureCardsRouter);

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`NameCard backend listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database. Server will still start, but DB operations may fail.', err);
    app.listen(PORT, () => {
      console.log(`NameCard backend listening on port ${PORT} (DB init failed)`);
    });
  });
