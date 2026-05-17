import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import operativosRoutes from './routes/operativos.js';
import campaniasRoutes from './routes/campanias.js';
import noticiasRoutes from './routes/noticias.js';
import voluntariosRoutes from './routes/voluntarios.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/operativos', operativosRoutes);
app.use('/api/campanias', campaniasRoutes);
app.use('/api/noticias', noticiasRoutes);
app.use('/api/voluntarios', voluntariosRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Yunka Atoq API corriendo en http://localhost:${PORT}`);
});
