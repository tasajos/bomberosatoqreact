/**
 * Verifica la conexión a MySQL y muestra el estado de las tablas.
 * Uso: node scripts/check-db.js
 */
import pool from '../db.js';

async function main() {
  console.log('\n=== Yunka Atoq · Check DB ===\n');

  try {
    const conn = await pool.getConnection();
    const [[{ v }]] = await conn.query('SELECT VERSION() AS v');
    console.log(`✅ Conectado a MySQL ${v}`);

    const [tables] = await conn.query('SHOW TABLES');
    const names = tables.map(t => Object.values(t)[0]);
    console.log(`📦 Tablas encontradas: ${names.join(', ')}\n`);

    const required = ['users','operativos','campanias','donaciones','noticias','postulaciones','voluntarios'];
    for (const t of required) {
      if (names.includes(t)) {
        const [[{ c }]] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
        console.log(`  ✅ ${t.padEnd(16)} ${c} registros`);
      } else {
        console.log(`  ❌ ${t.padEnd(16)} NO EXISTE — ejecuta schema.sql`);
      }
    }

    conn.release();
    console.log('\n✅ Base de datos lista.\n');
  } catch (err) {
    console.error('\n❌ No se pudo conectar a MySQL:', err.message);
    console.log('\nRevisa tu backend/.env:');
    console.log('  DB_HOST=' + (process.env.DB_HOST || 'localhost'));
    console.log('  DB_PORT=' + (process.env.DB_PORT || 3306));
    console.log('  DB_USER=' + (process.env.DB_USER || 'root'));
    console.log('  DB_NAME=' + (process.env.DB_NAME || 'yunka_atoq'));
    process.exit(1);
  }

  process.exit(0);
}

main();
