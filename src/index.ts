import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import authRoutes from './routes/authRoutes';
import publicRoutes from './routes/publicRoutes';
import sppgRoutes from './routes/sppgRoutes';
import schoolRoutes from './routes/schoolRoutes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({ message: 'SIMBA API is running 🚀' });
});

app.use('/api/auth', authRoutes);
app.use('/api', publicRoutes);
app.use('/api/sppg', sppgRoutes);
app.use('/api/school', schoolRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server SIMBA berjalan di http://localhost:${PORT}`);
});

export default app;