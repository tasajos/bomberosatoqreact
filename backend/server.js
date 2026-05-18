import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import operativosRoutes from './routes/operativos.js';
import campaniasRoutes from './routes/campanias.js';
import noticiasRoutes from './routes/noticias.js';
import voluntariosRoutes from './routes/voluntarios.js';
import sliderRoutes          from './routes/slider.js';
import reconocimientosRoutes from './routes/reconocimientos.js';
import serviciosRoutes       from './routes/servicios.js';
import galeriaRoutes         from './routes/galeria.js';
import suscriptoresRoutes    from './routes/suscriptores.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Servir archivos subidos (imágenes del slider, etc.)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth',       authRoutes);
app.use('/api/operativos', operativosRoutes);
app.use('/api/campanias',  campaniasRoutes);
app.use('/api/noticias',   noticiasRoutes);
app.use('/api/voluntarios',voluntariosRoutes);
app.use('/api/slider',          sliderRoutes);
app.use('/api/reconocimientos', reconocimientosRoutes);
app.use('/api/servicios',       serviciosRoutes);
app.use('/api/galeria',         galeriaRoutes);
app.use('/api/suscriptores',    suscriptoresRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`Yunka Atoq API corriendo en http://localhost:${PORT}`);
});
