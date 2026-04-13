import React, { useState, useEffect } from 'react';

export default function AdminDashboard() {
  // 1. Inicia en el historial por defecto
  const [activeTab, setActiveTab] = useState('registros'); 
  
  const [registros, setRegistros] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [lugares, setLugares] = useState([]);
  
  // Estados para los buscadores y filtros
  const [busquedaHistorial, setBusquedaHistorial] = useState('');
  const [filtroLugarHistorial, setFiltroLugarHistorial] = useState('');
  
  const [busquedaDirectorio, setBusquedaDirectorio] = useState('');
  const [filtroUbicacionDirectorio, setFiltroUbicacionDirectorio] = useState('');

  const [lugarSeleccionado, setLugarSeleccionado] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3000/api/registros').then(res => res.json()).then(data => setRegistros(data));
    fetch('http://localhost:3000/api/usuarios').then(res => res.json()).then(data => setUsuarios(data));
    fetch('http://localhost:3000/api/lugares').then(res => res.json()).then(data => setLugares(data));
  }, []);

  const formatearHora = (fechaIso) => new Date(fechaIso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Lógica de filtrado para Pestaña 1
  const registrosFiltrados = registros.filter(reg => {
    const nombreUsuario = reg.Usuario ? reg.Usuario.nombre.toLowerCase() : 'desconocido';
    const cumpleBusqueda = nombreUsuario.includes(busquedaHistorial.toLowerCase());
    const cumpleFiltro = filtroLugarHistorial ? (reg.Lugar && reg.Lugar.nombre === filtroLugarHistorial) : true;
    return cumpleBusqueda && cumpleFiltro;
  });

  // Lógica de filtrado para Pestaña 2
  const usuariosFiltrados = usuarios.filter(user => {
    const cumpleBusqueda = user.nombre.toLowerCase().includes(busquedaDirectorio.toLowerCase());
    const cumpleFiltro = filtroUbicacionDirectorio === '' ? true :
                         filtroUbicacionDirectorio === 'Fuera' ? !user.UbicacionActual :
                         (user.UbicacionActual && user.UbicacionActual.nombre === filtroUbicacionDirectorio);
    return cumpleBusqueda && cumpleFiltro;
  });

  // Lógica de Jerarquía para Pestaña 3
  const obtenerIdsDescendientes = (idLugar) => {
    let ids = [idLugar];
    const hijos = lugares.filter(l => l.padreId === idLugar);
    hijos.forEach(hijo => {
      ids = [...ids, ...obtenerIdsDescendientes(hijo.id)];
    });
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
            <li>
              <button onClick={() => {setActiveTab('registros'); setLugarSeleccionado(null);}} className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${activeTab === 'registros' ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-100'}`}>
                📊 Historial
              </button>
            </li>
            <li>
              <button onClick={() => {setActiveTab('usuarios'); setLugarSeleccionado(null);}} className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${activeTab === 'usuarios' ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-100'}`}>
                👥 Directorio
              </button>
            </li>
            <li>
              <button onClick={() => {setActiveTab('ocupacion'); setLugarSeleccionado(null);}} className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${activeTab === 'ocupacion' ? 'bg-blue-100 text-blue-900' : 'hover:bg-slate-100'}`}>
                🏢 Ocupación Áreas
              </button>
            </li>
          </ul>
        </aside>

        <main className="w-3/4 bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[500px]">
          
          {/* --- PESTAÑA 1: HISTORIAL --- */}
          {activeTab === 'registros' && (
            <div className="animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 mb-6 gap-4">
                <h2 className="text-2xl font-bold text-slate-800">Historial de Accesos</h2>
                
                {/* 3. Buscadores de regreso */}
                <div className="flex gap-2 w-full md:w-auto">
                  <input 
                    type="text" 
                    placeholder="Buscar persona..." 
                    value={busquedaHistorial}
                    onChange={(e) => setBusquedaHistorial(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-full md:w-48 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <select 
                    value={filtroLugarHistorial}
                    onChange={(e) => setFiltroLugarHistorial(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Todos los lugares</option>
                    {lugares.map(l => (
                      <option key={l.id} value={l.nombre}>{l.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-4 font-semibold">Usuario</th>
                      <th className="p-4 font-semibold">Lugar del Lector</th>
                      <th className="p-4 font-semibold">Estado</th>
                      <th className="p-4 font-semibold">Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {registrosFiltrados.length > 0 ? (
                      registrosFiltrados.map((reg) => (
                        <tr key={reg.id} className="hover:bg-slate-50">
                          <td className="p-4 font-medium text-slate-900">{reg.Usuario ? reg.Usuario.nombre : 'Desconocido'}</td>
                          <td className="p-4 text-slate-600">{reg.Lugar ? reg.Lugar.nombre : 'Sin registrar'}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${reg.estado === 'Acceso Permitido' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {reg.estado}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500">{formatearHora(reg.createdAt)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="p-6 text-center text-slate-400 italic">No se encontraron registros.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- PESTAÑA 2: DIRECTORIO --- */}
          {activeTab === 'usuarios' && (
            <div className="animate-fade-in">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 mb-6 gap-4">
                <h2 className="text-2xl font-bold text-slate-800">Directorio y Ubicación Actual</h2>
                
                {/* 3. Buscadores de regreso */}
                <div className="flex gap-2 w-full md:w-auto">
                  <input 
                    type="text" 
                    placeholder="Buscar por nombre..." 
                    value={busquedaDirectorio}
                    onChange={(e) => setBusquedaDirectorio(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-full md:w-48 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <select 
                    value={filtroUbicacionDirectorio}
                    onChange={(e) => setFiltroUbicacionDirectorio(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">¿Dónde están?</option>
                    <option value="Fuera">Fuera del sistema</option>
                    {lugares.map(l => (
                      <option key={l.id} value={l.nombre}>{l.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-4 font-semibold">Nombre</th>
                      <th className="p-4 font-semibold">Facultad / Rol</th>
                      <th className="p-4 font-semibold">📍 Ubicación Actual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {usuariosFiltrados.length > 0 ? (
                      usuariosFiltrados.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50">
                          <td className="p-4 font-medium text-slate-900">
                            {user.nombre} <br/><span className="text-xs text-slate-400 font-normal">{user.uid}</span>
                          </td>
                          <td className="p-4 text-slate-600">
                            {user.facultad || 'Sin Facultad'} <br/><span className="bg-slate-200 px-2 py-0.5 rounded-md text-xs mt-1 inline-block">{user.rol}</span>
                          </td>
                          <td className="p-4 text-slate-500 italic">
                            {user.UbicacionActual ? user.UbicacionActual.nombre : 'Fuera del sistema'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="p-6 text-center text-slate-400 italic">No se encontraron usuarios.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- PESTAÑA 3: OCUPACIÓN --- */}
          {activeTab === 'ocupacion' && (
            <div className="animate-fade-in">
              {!lugarSeleccionado ? (
                <>
                  <h2 className="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-4 mb-6">Mapa de Ocupación Global</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {ocupacionPorLugar.map(lugar => (
                      <div 
                        key={lugar.id} 
                        onClick={() => setLugarSeleccionado(lugar)}
                        className="cursor-pointer border border-slate-200 rounded-xl p-5 flex flex-col items-center justify-center bg-slate-50 shadow-sm hover:shadow-md hover:border-blue-300 hover:bg-blue-50 transition-all transform hover:-translate-y-1"
                      >
                        <span className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-1">{lugar.tipo}</span>
                        <h3 className="text-lg font-bold text-slate-800 text-center mb-3 leading-tight">{lugar.nombre}</h3>
                        <div className="flex items-end gap-1">
                          <span className="text-4xl font-black text-blue-600">{lugar.ocupacion}</span>
                        </div>
                        <span className="text-slate-500 text-xs mt-1 font-medium">clic para ver detalles</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="animate-fade-in">
                  <button 
                    onClick={() => setLugarSeleccionado(null)}
                    className="mb-4 text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    ← Volver a todas las áreas
                  </button>
                  
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-6">
                    <span className="text-sm font-bold tracking-widest text-blue-400 uppercase">{lugarSeleccionado.tipo}</span>
                    <h2 className="text-3xl font-bold text-blue-900 mt-1">{lugarSeleccionado.nombre}</h2>
                    <p className="text-blue-700 mt-2 font-medium">
                      Ocupación actual: <span className="font-bold text-lg">{lugarSeleccionado.ocupacion} personas</span> detectadas (incluyendo sub-áreas).
                    </p>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">Personas en esta área</h3>
                  
                  {lugarSeleccionado.personas.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 italic">No hay nadie registrado en esta área actualmente.</div>
                  ) : (
                    <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="p-4 font-semibold">Nombre</th>
                            <th className="p-4 font-semibold">Rol</th>
                            <th className="p-4 font-semibold">Último Lector Detectado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {lugarSeleccionado.personas.map((persona) => (
                            <tr key={persona.id} className="hover:bg-slate-50">
                              <td className="p-4 font-medium text-slate-900">{persona.nombre}</td>
                              <td className="p-4 text-slate-600"><span className="bg-slate-200 px-2 py-1 rounded-md text-xs">{persona.rol}</span></td>
                              <td className="p-4 text-slate-500">
                                {lugares.find(l => l.id === persona.UbicacionActualId)?.nombre || 'Desconocido'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}