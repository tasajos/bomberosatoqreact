import bcrypt from 'bcryptjs';
import pool from '../db.js';

const defaultHash = await bcrypt.hash('Yunka2026!', 12);

const voluntarios = [
  // email, nombre, ap_paterno, ap_materno, nacimiento, ci, telefono, domicilio, contacto_nombre, contacto_tel, codigo, matricula
  ['cazcarraga@chakuy.com',              'Carlos',            'Azcarraga',   'Esquivel',  '1985-11-29','4947021',  '70776212','Mariano Mendez 2135',                          'Pablo Azcarraga',           '79361121','VF','VF-001','admin'],
  ['dkrojas123@gmail.com',              'David',             'Rojas',       'Cruz',      '1990-10-26','8058297',  '68540762','Quillacollo - Cochabamba',                     'Neyza Rojas Cruz',          '76431861','VF','VF-002','voluntario'],
  ['mirandaalejando3@gmail.com',        'Alejandro',         'Miranda',     'Andia',     '1999-05-21','8755165',  '75498373','Blaco Galindo kilómetro 7',                    '',                          '75498373','VF','VF-003','voluntario'],
  ['amelgar@yunkaatoq.org',             'Alvaro Marcelo',    'Melgar',      'Mejia',     '2003-02-05','14092936', '76982189','Sacaba - Abra Baja',                           'Marcela Mejia Galarza',     '76416429','VF','VF-004','voluntario'],
  ['liletvalencia123@gmail.com',        'Lilet Eliana',      'Valencia',    'Rocha',     '2001-05-27','7933240',  '70302326','Av. Linde',                                    'Edelfrida Rocha',           '76934219','VF','VF-005','voluntario'],
  ['castellonflorespatricia@gmail.com', 'Patricia',          'Castellón',   'Flores',    '2004-03-24','14440582', '65711047','Calle Teofilo Vargas esq. Tomás O\'con',       'Oliver Castellon Soto',     '70350412','VF','VF-006','voluntario'],
  ['huancafernandezjimena@gmail.com',   'Jimena',            'Huanca',      'Fernandez', '2002-05-18','12683255', '64927626','Molle Molle - Sacaba',                         'Efrain',                    '72292472','VC','VC-001','voluntario'],
  ['tixnipachaarmatacanaviri@gmail.com','Tixni Pacha',       'Armata',      'Canaviri',  '2005-10-12','9315473',  '72287405','Valle Hermoso, calle Canadá',                  'Silvana Sissy Canaviri',    '77585192','VR','VR-001','voluntario'],
  ['illaphaxiarmatacanaviri@gmail.com', 'Illa Phaxi',        'Armata',      'Canaviri',  '2004-05-25','9315485',  '71250705','Valle Hermoso, calle Canadá',                  'Silvana Sissy Canaviri',    '77585192','VR','VR-002','voluntario'],
  ['leidyandia123@gmail.com',           'Leidy',             'Andia',       'Mamani',    '2003-06-15','15370851', '76926056','Zona Sud OTB Rio Seco',                        'Carmen Andia Mamani',       '76940716','VR','VR-003','voluntario'],
  ['ballesteroschumaceroandrea@gmail.com','Andrea Patricia', 'Ballesteros', 'Chumacero', '2004-03-26','13590075', '67429432','Calle Roberto Prada entre Miguel de C.',       'Cervantes',                 '',        'VR','VR-004','voluntario'],
  ['duveyzabejarano042@gmail.com',      'Duveyza Valery',    'Bejarano',    'Molina',    '2006-10-29','14866271', '63887573','Av. Circunvalación y Av. Pando',               '',                          '',        'VR','VR-005','voluntario'],
  ['luzzarelaperezrocha@gmail.com',     'Luz Zarela',        'Pérez',       'Rocha',     '2004-12-31','12681939', '76439273','Tiquipaya - C. Santiaguilla',                  '',                          '',        'VR','VR-006','voluntario'],
  ['jamachionofre@yunkaatoq.org',       'Mario',             'Jamachi',     'Onofre',    '2002-07-30','9357188',  '75964910','Av. Centenario',                               '',                          '',        'VR','VR-007','voluntario'],
  ['lizeth.andia@yunkaatoq.org',        'Lizeth',            'Andia',       'Mamani',    null,        '14150889', '',        '',                                             '',                          '',        'VR','VR-008','voluntario'],
  ['livancordova@yunkaatoq.org',        'Livan Jossue',      'Cordova',     'Viscarra',  '1994-12-25','8676325',  '',        '',                                             '',                          '',        'VR','VR-009','voluntario'],
  ['fernandoalvarez@yunkaatoq.org',     'Fernando',          'Alvarez',     'Rojas',     '1986-01-05','3618342',  '67495732','Villa Taquiña',                                '',                          '',        'VR','VR-010','voluntario'],
  ['jhanetillanesvargas@gmail.com',     'Jhanet',            'Illanes',     'Vargas',    '2004-08-16','14195605', '68551374','C. Victor Ustariz km 3.5',                     '',                          '',        'VR','VR-011','voluntario'],
  ['yanapanqarita@gmail.com',           'Silvana Sissy',     'Canaviri',    'Mamani',    '1980-11-14','3577546',  '77585192','Zona Sud, Valle Hermoso calle Egipto',         '',                          '',        'VC','VC-002','voluntario'],
  ['andreasandoval@yunkaatoq.org',      'Andrea',            'Sandoval',    'Tarifa',    '1994-02-07','9392566',  '70797734','Av. Ruiseñor, calle Pacara',                   '',                          '',        'VR','VR-012','voluntario'],
  ['yerlhintpaniagua@yunkaatoq.org',    'Yerlhint Alejandra','Paniagua',    'Rocha',     null,        '12522839', '',        '',                                             '',                          '',        'VR','VR-013','voluntario'],
  ['brandoncadima@yunkaatoq.org',       'Brandon',           'Cadima',      'Rocha',     '2008-08-05','15453460', '62666119','Avenida Linde y Calle Los Olivos',             '',                          '',        'VR','VR-014','voluntario'],
];

let created = 0;
let skipped = 0;

for (const [email, nombre, ap, am, nac, ci, tel, dom, cnombre, ctel, codigo, matricula, role] of voluntarios) {
  try {
    const [ex] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (ex.length > 0) { console.log(`ℹ️  Ya existe: ${email}`); skipped++; continue; }

    await pool.query(
      `INSERT INTO users (nombre,apellido_paterno,apellido_materno,fecha_nacimiento,
        carnet_identidad,telefono,domicilio,email,password_hash,role,
        contacto_nombre,contacto_telefono,codigo,matricula,activo)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      [nombre, ap, am, nac, ci, tel, dom, email, defaultHash, role,
       cnombre, ctel, codigo, matricula]
    );
    console.log(`✅ ${nombre} ${ap} (${matricula})`);
    created++;
  } catch (e) {
    console.error(`❌ ${email}: ${e.message}`);
  }
}

console.log(`\n✅ ${created} voluntarios registrados · ${skipped} omitidos.`);
console.log('🔑 Contraseña por defecto: Yunka2026!');
process.exit(0);
