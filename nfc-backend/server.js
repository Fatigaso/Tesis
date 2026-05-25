const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const http = require('http'); // <-- 1. Importamos el módulo http
const { Server } = require('socket.io'); // <-- 2. Importamos Socket.io

const app = express();
const server = http.createServer(app); // <-- 3. Envolvemos Express en el servidor HTTP
const io = new Server(server, {
  cors: { origin: '*' } // Permitimos que cualquier frontend se conecte
});

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
  try {
    // El ESP32 debe mandar el UID de la tarjeta y su propio ID de lugar
    const { uid, lugarId } = req.body;

    // 1. Buscamos a la persona y al lugar
    const usuario = await Usuario.findOne({ where: { uid } });
    const lugar = await Lugar.findByPk(lugarId);

    // 2. Si la tarjeta no está registrada -> ACCESO DENEGADO
    if (!usuario) {
      await Registro.create({
        uid_leido: uid,
        UsuarioId: null, // <-- Con U Mayúscula
        LugarId: lugarId || null, // <-- Con L Mayúscula
        estado: 'Acceso Denegado'
      });
      io.emit('nueva_lectura'); // Avisar al React
      return res.json({ acceso: false, mensaje: 'Tarjeta no registrada' });
    }

    if (!lugar) {
      return res.status(400).json({ error: 'Lugar no encontrado en el sistema.' });
    }

    let estadoRegistro = '';
    let nuevaUbicacion = null;

    // 3. LÓGICA DE ENTRADA Y SALIDA
    if (usuario.UbicacionActualId === lugar.id) {
      estadoRegistro = 'Salida';
      nuevaUbicacion = lugar.padreId; 
    } else {
      estadoRegistro = 'Entrada';
      nuevaUbicacion = lugar.id;
    }

    // 4. Guardar los cambios en la base de datos
    await usuario.update({ UbicacionActualId: nuevaUbicacion });
    await Registro.create({
      uid_leido: uid,
      UsuarioId: usuario.id, // <-- CORREGIDO: U Mayúscula
      LugarId: lugar.id,     // <-- CORREGIDO: L Mayúscula
      estado: estadoRegistro
    });

    // Avisar al React para que actualice las tablas e indicadores al instante
    io.emit('nueva_lectura');

    // Responder al ESP32 (puedes prender un LED verde para entrada y un LED azul para salida si quieres)
    res.json({ acceso: true, estado: estadoRegistro, usuario: usuario.nombre });

  } catch (error) {
    console.error('Error en la lectura:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/lugares', async (req, res) => {
  try {
    const { nombre, tipo, padreId } = req.body;
    // Si el padreId viene vacío, lo guardamos como null (nivel raíz)
    const nuevoLugar = await Lugar.create({ 
      nombre, 
      tipo, 
      padreId: padreId ? padreId : null 
    });
    res.json({ exito: true, lugar: nuevoLugar });
  } catch (error) {
    res.status(400).json({ error: 'Error al crear el lugar: ' + error.message });
  }
});

// Ruta para crear un nuevo Usuario
app.post('/api/usuarios', async (req, res) => {
  try {
    const { nombre, uid, facultad, rol } = req.body;
    const nuevoUsuario = await Usuario.create({ nombre, uid, facultad, rol });
    res.json({ exito: true, usuario: nuevoUsuario });
  } catch (error) {
    // Manejo de error si el UID ya está registrado (es UNIQUE en la BD)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Ese UID ya está registrado en otra tarjeta.' });
    }
    res.status(400).json({ error: 'Error al registrar usuario: ' + error.message });
  }
});

// --- INICIAR SERVIDOR ---
const PORT = 3000;
// 5. force: false asegura que NO se borren tus datos al reiniciar el servidor.
// Como quitamos los datos falsos, la BD iniciará en blanco la primera vez.
sequelize.sync({ force: false }).then(() => {
  console.log('✅ Base de datos lista.');

  // 6. Usamos server.listen en lugar de app.listen para arrancar HTTP + WebSockets
  server.listen(PORT, '0.0.0.0', () => console.log(`🚀 API y WebSockets listos en http://localhost:${PORT}`));
});