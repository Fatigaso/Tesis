import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('registros'); 
  
  const [registros, setRegistros] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [lugares, setLugares] = useState([]);
  
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [filtroLugarHistorial, setFiltroLugarHistorial] = useState('');
  const [busquedaDirectorio, setBusquedaDirectorio] = useState('');
  const [filtroUbicacionDirectorio, setFiltroUbicacionDirectorio] = useState('');
  const [lugarSeleccionado, setLugarSeleccionado] = useState(null);

  const [mensajeAdmin, setMensajeAdmin] = useState({ texto: '', tipo: '' });
  
  const [formLugar, setFormLugar] = useState({ nombre: '', tipo: 'Campus', padreId: '' });
  const [formUsuario, setFormUsuario] = useState({ nombre: '', uid: '', facultad: '', rol: 'Alumno' });

  const cargarDatos = () => {
    fetch('http://localhost:3000/api/registros').then(res => res.json()).then(data => setRegistros(data));
    fetch('http://localhost:3000/api/usuarios').then(res => res.json()).then(data => setUsuarios(data));
    fetch('http://localhost:3000/api/lugares').then(res => res.json()).then(data => setLugares(data));
  };

  useEffect(() => {
    cargarDatos();
    const socket = io('http://localhost:3000');
    socket.on('nueva_lectura', () => cargarDatos());
    return () => socket.disconnect();
  }, []);

  const crearLugar = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/api/lugares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formLugar)
      });
      const data = await res.json();
      if (data.exito) {
        setMensajeAdmin({ texto: '¡Lugar creado con éxito!', tipo: 'exito' });
        setFormLugar({ nombre: '', tipo: 'Campus', padreId: '' });
        cargarDatos();
      } else {
        setMensajeAdmin({ texto: data.error, tipo: 'error' });
      }
    } catch (error) {
      setMensajeAdmin({ texto: 'Error de conexión con el servidor', tipo: 'error' });
    }
    setTimeout(() => setMensajeAdmin({ texto: '', tipo: '' }), 4000);
  };

  const crearUsuario = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formUsuario)
      });
      const data = await res.json();
      if (data.exito) {
        setMensajeAdmin({ texto: '¡Usuario registrado con éxito!', tipo: 'exito' });
        setFormUsuario({ nombre: '', uid: '', facultad: '', rol: 'Alumno' });
        cargarDatos();
      } else {
        setMensajeAdmin({ texto: data.error, tipo: 'error' });
      }
    } catch (error) {
      setMensajeAdmin({ texto: 'Error de conexión con el servidor', tipo: 'error' });
    }
    setTimeout(() => setMensajeAdmin({ texto: '', tipo: '' }), 4000);
  };

  const formatearHora = (fechaIso) => new Date(fechaIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const registrosFiltrados = registros.filter(reg => {
    const nombreUsuario = reg.Usuario ? reg.Usuario.nombre.toLowerCase() : 'desconocido';
    return nombreUsuario.includes(busquedaHistorial.toLowerCase()) && 
           (filtroLugarHistorial ? (reg.Lugar && reg.Lugar.nombre === filtroLugarHistorial) : true);
  });

  const usuariosFiltrados = usuarios.filter(user => {
    return user.nombre.toLowerCase().includes(busquedaDirectorio.toLowerCase()) && 
           (filtroUbicacionDirectorio === '' ? true :
            filtroUbicacionDirectorio === 'Fuera' ? !user.UbicacionActual :
            (user.UbicacionActual && user.UbicacionActual.nombre === filtroUbicacionDirectorio));
  });

  const obtenerIdsDescendientes = (idLugar) => {
    let ids = [idLugar];
    const hijos = lugares.filter(l => l.padreId === idLugar);
    hijos.forEach(hijo => { ids = [...ids, ...obtenerIdsDescendientes(hijo.id)]; });
    return ids;
  };

  const ocupacionPorLugar = lugares.map(lugar => {
    const idsValidos = obtenerIdsDescendientes(lugar.id);
    const personasAdentro = usuarios.filter(u => idsValidos.includes(u.UbicacionActualId));
    return { ...lugar, ocupacion: personasAdentro.length, personas: personasAdentro };
  });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <nav className="bg-blue-900 text-white shadow-lg p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold flex items-center gap-2">📍 NFC-Access Jerárquico</h1>
          <div className="text-sm bg-blue-700 px-3 py-1 rounded-full border border-blue-500 shadow-inner">Conectado al Servidor 🟢</div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto mt-8 flex gap-6 px-4 pb-12">
        <aside className="w-1/4 bg-white rounded-xl shadow-sm p-4 h-fit border border-slate-200">
          <ul className="space-y-2">
            <li><button onClick={() => {setActiveTab('registros'); setLugarSeleccionado(null);}} className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${activeTab === 'registros' ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-100'}`}>📊 Historial</button></li>
            <li><button onClick={() => {setActiveTab('usuarios'); setLugarSeleccionado(null);}} className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${activeTab === 'usuarios' ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-100'}`}>👥 Directorio</button></li>
            <li><button onClick={() => {setActiveTab('ocupacion'); setLugarSeleccionado(null);}} className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${activeTab === 'ocupacion' ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-100'}`}>🏢 Ocupación Áreas</button></li>
            <li><button onClick={() => {setActiveTab('admin'); setLugarSeleccionado(null);}} className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${activeTab === 'admin' ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-100'}`}>⚙️ Administración</button></li>
          </ul>
        </aside>

        <main className="w-3/4 bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[500px]">
          
          {activeTab === 'registros' && (
             <div className="animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 mb-6 gap-4">
               <h2 className="text-2xl font-bold text-slate-800">Historial de Accesos</h2>
               <div className="flex gap-2 w-full md:w-auto">
                 <input type="text" placeholder="Buscar persona..." value={busquedaHistorial} onChange={(e) => setBusquedaHistorial(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-full md:w-48" />
                 <select value={filtroLugarHistorial} onChange={(e) => setFiltroLugarHistorial(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                   <option value="">Todos los lugares</option>
                   {lugares.map(l => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
                 </select>
               </div>
             </div>
             <div className="overflow-hidden rounded-lg border border-slate-200">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-100 text-slate-600"><tr><th className="p-4">Usuario</th><th className="p-4">Lugar</th><th className="p-4">Estado</th><th className="p-4">Hora</th></tr></thead>
                 <tbody className="divide-y divide-slate-200">
                   {registrosFiltrados.length > 0 ? registrosFiltrados.map((reg) => (
                     <tr key={reg.id} className="hover:bg-slate-50">
                       <td className="p-4 font-medium">{reg.Usuario ? reg.Usuario.nombre : `Desconocido (UID: ${reg.uid_leido})`}</td>
                       <td className="p-4 text-slate-600">{reg.Lugar ? reg.Lugar.nombre : 'Lugar no especificado'}</td>
                       <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold shadow-sm border ${
                          reg.estado === 'Entrada' ? 'bg-green-100 text-green-700 border-green-200' : 
                          reg.estado === 'Acceso Denegado' ? 'bg-red-100 text-red-700 border-red-200' : 
                          'bg-red-100 text-red-700 border-red-200'  
                        }`}>
                          {reg.estado}
                        </span>
                      </td>
                       <td className="p-4 text-slate-500">{formatearHora(reg.createdAt)}</td>
                     </tr>
                   )) : <tr><td colSpan="4" className="p-6 text-center text-slate-400 italic">No hay registros.</td></tr>}
                 </tbody>
               </table>
             </div>
           </div>
          )}

          {activeTab === 'usuarios' && (
             <div className="animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 mb-6 gap-4">
               <h2 className="text-2xl font-bold text-slate-800">Directorio y Ubicación Actual</h2>
               <div className="flex gap-2 w-full md:w-auto">
                 <input type="text" placeholder="Buscar por nombre..." value={busquedaDirectorio} onChange={(e) => setBusquedaDirectorio(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-full md:w-48" />
                 <select value={filtroUbicacionDirectorio} onChange={(e) => setFiltroUbicacionDirectorio(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm">
                   <option value="">¿Dónde están?</option>
                   <option value="Fuera">Fuera del sistema</option>
                   {lugares.map(l => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
                 </select>
               </div>
             </div>
             <div className="overflow-hidden rounded-lg border border-slate-200">
               <table className="w-full text-left text-sm">
                 <thead className="bg-slate-100 text-slate-600"><tr><th className="p-4">Nombre</th><th className="p-4">Facultad / Rol</th><th className="p-4">📍 Ubicación</th></tr></thead>
                 <tbody className="divide-y divide-slate-200">
                   {usuariosFiltrados.length > 0 ? usuariosFiltrados.map((user) => (
                     <tr key={user.id} className="hover:bg-slate-50">
                       <td className="p-4 font-medium">{user.nombre} <br/><span className="text-xs text-slate-400">{user.uid}</span></td>
                       <td className="p-4 text-slate-600">{user.facultad} <br/><span className="bg-slate-200 px-2 py-0.5 rounded-md text-xs">{user.rol}</span></td>
                       <td className="p-4 text-slate-500 italic">{user.UbicacionActual ? user.UbicacionActual.nombre : 'Fuera del sistema'}</td>
                     </tr>
                   )) : <tr><td colSpan="3" className="p-6 text-center text-slate-400 italic">No hay usuarios.</td></tr>}
                 </tbody>
               </table>
             </div>
           </div>
          )}

          {activeTab === 'ocupacion' && (
             <div className="animate-fade-in">
             {!lugarSeleccionado ? (
               <>
                 <h2 className="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-4 mb-6">Mapa de Ocupación Global</h2>
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                   {ocupacionPorLugar.map(lugar => (
                     <div key={lugar.id} onClick={() => setLugarSeleccionado(lugar)} className="cursor-pointer border border-slate-200 rounded-xl p-5 flex flex-col items-center bg-slate-50 hover:border-blue-300 hover:bg-blue-50 transition-all relative">
                       {/* ETIQUETA NUEVA PARA MOSTRAR EL ID AL ADMINISTRADOR */}
                       <div className="absolute top-3 right-3 bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded text-xs border border-blue-200">
                         ID: {lugar.id}
                       </div>
                       
                       <span className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-1 mt-2">{lugar.tipo}</span>
                       <h3 className="text-lg font-bold text-center mb-3">{lugar.nombre}</h3>
                       <span className="text-4xl font-black text-blue-600">{lugar.ocupacion}</span>
                     </div>
                   ))}
                 </div>
               </>
             ) : (
               <div className="animate-fade-in">
                 <button onClick={() => setLugarSeleccionado(null)} className="mb-4 text-sm font-semibold text-blue-600">← Volver</button>
                 <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
                   <h2 className="text-3xl font-bold text-blue-900">{lugarSeleccionado.nombre} <span className="text-lg text-blue-500 ml-2 font-normal">(ID ESP32: {lugarSeleccionado.id})</span></h2>
                   <p className="text-blue-700 mt-2 font-medium">Ocupación: <span className="font-bold">{lugarSeleccionado.ocupacion} personas</span> detectadas.</p>
                 </div>
                 <h3 className="text-lg font-bold border-b pb-2 mb-4">Personas en esta área</h3>
                 <div className="overflow-hidden rounded-lg border border-slate-200">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-slate-100"><tr><th className="p-4">Nombre</th><th className="p-4">Rol</th></tr></thead>
                     <tbody>
                       {lugarSeleccionado.personas.map((persona) => (
                         <tr key={persona.id} className="border-t"><td className="p-4">{persona.nombre}</td><td className="p-4">{persona.rol}</td></tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             )}
           </div>
          )}

          {activeTab === 'admin' && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-4 mb-6">⚙️ Altas al Sistema</h2>

              {mensajeAdmin.texto && (
                <div className={`p-4 mb-6 rounded-lg font-semibold ${mensajeAdmin.tipo === 'exito' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300'}`}>
                  {mensajeAdmin.texto}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* FORMULARIO: ALTA DE LUGAR */}
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">📍 Registrar Nuevo Lugar</h3>
                  <form onSubmit={crearLugar} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1">Nombre del Lugar</label>
                      <input required type="text" value={formLugar.nombre} onChange={e => setFormLugar({...formLugar, nombre: e.target.value})} placeholder="Ej: Laboratorio 4, Campus Central..." className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1">Tipo de Lugar</label>
                      <select required value={formLugar.tipo} onChange={e => setFormLugar({...formLugar, tipo: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none">
                        <option value="Campus">Campus</option>
                        <option value="Facultad">Facultad / Edificio</option>
                        <option value="Salón">Salón / Laboratorio / Oficina</option>
                        <option value="Acceso">Punto de Acceso Principal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1">¿Está dentro de otro lugar? (Jerarquía)</label>
                      <select value={formLugar.padreId} onChange={e => setFormLugar({...formLugar, padreId: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none">
                        <option value="">No, es de nivel principal (Raíz)</option>
                        {/* SE MODIFICÓ AQUÍ PARA MOSTRAR EL ID EN EL SELECT */}
                        {lugares.map(l => (
                          <option key={l.id} value={l.id}>ID: {l.id} - Dentro de {l.nombre} ({l.tipo})</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Guardar Lugar</button>
                  </form>
                </div>

                {/* FORMULARIO: ALTA DE USUARIO */}
                <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl shadow-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">🧑‍🎓 Registrar Nueva Tarjeta</h3>
                  <form onSubmit={crearUsuario} className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1">Nombre Completo</label>
                      <input required type="text" value={formUsuario.nombre} onChange={e => setFormUsuario({...formUsuario, nombre: e.target.value})} placeholder="Ej: Ana López" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1">UID de la Tarjeta (NFC)</label>
                      <input required type="text" value={formUsuario.uid} onChange={e => setFormUsuario({...formUsuario, uid: e.target.value})} placeholder="Ej: 4A B2 C3 D4" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none uppercase" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1">Facultad / Departamento</label>
                      <input required type="text" value={formUsuario.facultad} onChange={e => setFormUsuario({...formUsuario, facultad: e.target.value})} placeholder="Ej: Facultad de Medicina" className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1">Rol</label>
                      <select required value={formUsuario.rol} onChange={e => setFormUsuario({...formUsuario, rol: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none">
                        <option value="Alumno">Alumno</option>
                        <option value="Docente">Docente</option>
                        <option value="Administrativo">Administrativo</option>
                        <option value="Mantenimiento">Mantenimiento</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Vincular Tarjeta</button>
                  </form>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}