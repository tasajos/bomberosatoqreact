/**
 * Script de configuración: genera hash del admin y verifica conexión DB.
 * Uso: node scripts/setup-admin.js
 */
import bcrypt from 'bcryptjs';
import pool from '../db.js';

const ADMIN_EMAIL    = 'admin@yunkaatoq.bo';
const ADMIN_PASSWORD = 'YunkaAtoq2026!';
const ADMIN_NOMBRE   = 'Administrador';

async function main() {
  console.log('\n=== Yunka Atoq · Setup Admin ===\n');

  // 1. Verificar conexión
  console.log('📡 Verificando conexión a MySQL...');
  try {
    const conn = await pool.getConnection();
    const [[row]] = await conn.query('SELECT VERSION() AS v');
    console.log(`✅ Conectado. MySQL ${row.v}\n`);
    conn.release();
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
    console.log('\nVerifica tu archivo .env:');
    console.log('  DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME\n');
    process.exit(1);
  }

  // 2. Verificar que la tabla users existe
  console.log('🔍 Verificando tablas...');
  try {
    await pool.query('SELECT 1 FROM users LIMIT 1');
    console.log('✅ Tabla "users" existe.\n');
  } catch {
    console.error('❌ La tabla "users" no existe.');
    console.log('👉 Ejecuta primero: backend/schema.sql en tu MySQL.\n');
    process.exit(1);
  }

  // 3. Generar hash
  console.log('🔐 Generando hash de contraseña...');
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  console.log('✅ Hash generado.\n');

  // 4. Insertar o actualizar admin
  console.log(`👤 Creando/actualizando usuario admin: ${ADMIN_EMAIL}`);
  try {
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ?', [ADMIN_EMAIL]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE users SET nombre=?, password_hash=?, role=?, activo=1 WHERE email=?',
        [ADMIN_NOMBRE, hash, 'admin', ADMIN_EMAIL]
      );
      console.log('✅ Usuario admin actualizado.\n');
    } else {
      await pool.query(
        'INSERT INTO users (nombre, email, password_hash, role, activo) VALUES (?,?,?,?,1)',
        [ADMIN_NOMBRE, ADMIN_EMAIL, hash, 'admin']
      );
      console.log('✅ Usuario admin creado.\n');
    }
  } catch (err) {
    console.error('❌ Error al crear usuario:', err.message);
    process.exit(1);
  }

  // 5. Verificar login
  console.log('🔑 Verificando que las credenciales funcionan...');
  const [[user]] = await pool.query('SELECT * FROM users WHERE email=?', [ADMIN_EMAIL]);
  const ok = await bcrypt.compare(ADMIN_PASSWORD, user.password_hash);
  if (ok) {
    console.log('✅ Login verificado correctamente.\n');
  } else {
    console.error('❌ El hash no coincide con la contraseña. Algo salió mal.\n');
    process.exit(1);
  }

  // 6. Mostrar SQL equivalente
  console.log('📋 SQL equivalente (para ejecutar manualmente si prefieres):\n');
  console.log('─'.repeat(60));
  console.log(`-- Ejecutar en la base de datos yunka_atoq`);
  console.log(`INSERT INTO users (nombre, email, password_hash, role, activo)`);
  console.log(`VALUES (`);
  console.log(`  '${ADMIN_NOMBRE}',`);
  console.log(`  '${ADMIN_EMAIL}',`);
  console.log(`  '${hash}',`);
  console.log(`  'admin',`);
  console.log(`  1`);
  console.log(`)`);
  console.log(`ON DUPLICATE KEY UPDATE`);
  console.log(`  password_hash = '${hash}',`);
  console.log(`  role = 'admin',`);
  console.log(`  activo = 1;`);
  console.log('─'.repeat(60));

  console.log('\n🎉 Setup completado. Credenciales de acceso:');
  console.log(`   Email:      ${ADMIN_EMAIL}`);
  console.log(`   Contraseña: ${ADMIN_PASSWORD}`);
  console.log(`   Rol:        admin`);
  console.log('\n🌐 Inicia el backend con: npm run dev\n');

  process.exit(0);
}

main().catch(err => {
  console.error('Error inesperado:', err);
  process.exit(1);
});
