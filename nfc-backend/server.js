const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
app.use(cors()); 
app.use(express.json()); 

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

// --- MODELOS ---
const Lugar = sequelize.define('Lugar', {
  nombre: { type: DataTypes.STRING, allowNull: false },
  tipo: { type: DataTypes.STRING, allowNull: false } 
});

const Usuario = sequelize.define('Usuario', {
  nombre: { type: DataTypes.STRING, allowNull: false },
  uid: { type: DataTypes.STRING, allowNull: false, unique: true },
  facultad: { type: DataTypes.STRING },
  rol: { type: DataTypes.STRING, defaultValue: 'Estudiante' }
});

const Registro = sequelize.define('Registro', {
  uid_leido: { type: DataTypes.STRING, allowNull: false },
  estado: { type: DataTypes.STRING, allowNull: false }, 
});

// --- RELACIONES ---
Usuario.hasMany(Registro);
Registro.belongsTo(Usuario);

Lugar.hasMany(Registro); 
Registro.belongsTo(Lugar); 

Usuario.belongsTo(Lugar, { as: 'UbicacionActual', foreignKey: 'UbicacionActualId' });

Lugar.belongsTo(Lugar, { as: 'Padre', foreignKey: 'padreId' });
Lugar.hasMany(Lugar, { as: 'SubLugares', foreignKey: 'padreId' });

// --- RUTAS DE LA API ---
app.get('/api/usuarios', async (req, res) => {
  const usuarios = await Usuario.findAll({ include: [{ model: Lugar, as: 'UbicacionActual' }] });
  res.json(usuarios);
});

app.get('/api/registros', async (req, res) => {
  const registros = await Registro.findAll({ include: [Usuario, Lugar], order: [['createdAt', 'DESC']] });
  res.json(registros);
});

app.get('/api/lugares', async (req, res) => {
  const lugares = await Lugar.findAll();
  res.json(lugares);
});

app.post('/api/verificar', async (req, res) => {
  const { uid, id_lugar } = req.body; 
  if (!uid || !id_lugar) return res.status(400).json({ error: 'Falta UID o ID del Lugar' });

  const usuario = await Usuario.findOne({ where: { uid: uid } });
  let estadoAcceso = 'Acceso Denegado', usuarioId = null, nombreUsuario = 'Desconocido';

  if (usuario) {
    estadoAcceso = 'Acceso Permitido';
    usuarioId = usuario.id;
    nombreUsuario = usuario.nombre;
    await usuario.update({ UbicacionActualId: id_lugar });
  }

  await Registro.create({ uid_leido: uid, estado: estadoAcceso, UsuarioId: usuarioId, LugarId: id_lugar });
  res.json({ acceso: estadoAcceso === 'Acceso Permitido', mensaje: estadoAcceso, nombre: nombreUsuario });
});

// --- INICIAR SERVIDOR ---
const PORT = 3000;
sequelize.sync({ force: true }).then(async () => {
  console.log('✅ Base de datos lista.');

  // 1. Creamos la jerarquía
  const campus = await Lugar.create({ nombre: 'Campus Principal', tipo: 'Campus' });
  const facuIng = await Lugar.create({ nombre: 'Facultad de Ingeniería', tipo: 'Facultad', padreId: campus.id });
  const facuArq = await Lugar.create({ nombre: 'Facultad de Arquitectura', tipo: 'Facultad', padreId: campus.id });
  const labRedes = await Lugar.create({ nombre: 'Laboratorio de Redes', tipo: 'Salón', padreId: facuIng.id });

  // 2. Metemos a los usuarios
  const user1 = await Usuario.create({ nombre: 'Carlos Peréz', uid: '123456', facultad: 'Ingeniería', rol: 'Estudiante', UbicacionActualId: labRedes.id });
  const user3 = await Usuario.create({ nombre: 'Omar Díaz Ventura', uid: 'B19CE268', facultad: 'Ingeniería', rol: 'Estudiante', UbicacionActualId: labRedes.id });
  const user2 = await Usuario.create({ nombre: 'Laura Gonzalez', uid: '789012', facultad: 'Arquitectura', rol: 'Docente', UbicacionActualId: campus.id });

  // 3. ¡NUEVO! Simulamos que pasaron sus tarjetas en los lectores
  await Registro.create({ uid_leido: user1.uid, estado: 'Acceso Permitido', UsuarioId: user1.id, LugarId: labRedes.id });
  await Registro.create({ uid_leido: user2.uid, estado: 'Acceso Permitido', UsuarioId: user2.id, LugarId: campus.id });
  
  // Simulamos a alguien que intentó entrar con una tarjeta no registrada
  await Registro.create({ uid_leido: 'A1B2C3D4', estado: 'Acceso Denegado', UsuarioId: null, LugarId: facuIng.id });

  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 API lista en http://localhost:${PORT}`));
});