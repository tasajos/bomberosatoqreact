import pool from '../db.js';
const [r] = await pool.query("UPDATE galeria SET category='Capacitacion' WHERE category='Entrenamiento'");
console.log('✅ Filas actualizadas:', r.affectedRows);
const [rows] = await pool.query('SELECT category, COUNT(*) as total FROM galeria GROUP BY category ORDER BY category');
rows.forEach(r => console.log(' ', r.category, '-', r.total));
process.exit(0);
