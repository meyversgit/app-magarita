/* ═══════════════════════════════════════════════════════════════
   admin.js — CondoManager Admin Panel JavaScript
   ═══════════════════════════════════════════════════════════════ */

const API = "http://127.0.0.1:5005";

// ── NAVIGATION ────────────────────────────────────────────────
const pageInfo = {
  'dashboard':          { title: 'Dashboard principal',        breadcrumb: 'Inicio › Dashboard' },
  'lista-residentes':   { title: 'Lista de Residentes',        breadcrumb: 'Inicio › Residentes › Lista' },
  'crear-residente':    { title: 'Nuevo Residente',            breadcrumb: 'Inicio › Residentes › Crear' },
  'editar-residente':   { title: 'Editar Residente',           breadcrumb: 'Inicio › Residentes › Editar' },
  'perfil-residente':   { title: 'Perfil del Residente',       breadcrumb: 'Inicio › Residentes › Perfil' },
  'lista-pagos':        { title: 'Lista de Pagos',             breadcrumb: 'Inicio › Pagos › Lista' },
  'registrar-pago':     { title: 'Registrar Pago',             breadcrumb: 'Inicio › Pagos › Registrar' },
  'historial-pagos':    { title: 'Historial de Pagos',         breadcrumb: 'Inicio › Pagos › Historial' },
  'crear-notificacion': { title: 'Crear Notificación',         breadcrumb: 'Inicio › Comunicación › Crear' },
  'lista-anuncios':     { title: 'Lista de Anuncios',          breadcrumb: 'Inicio › Comunicación › Anuncios' },
  'lista-incidencias':  { title: 'Lista de Incidencias',       breadcrumb: 'Inicio › Incidencias › Lista' },
  'crear-incidencia':   { title: 'Crear Incidencia',           breadcrumb: 'Inicio › Incidencias › Crear' },
  'detalle-incidencia': { title: 'Detalle de Incidencia',      breadcrumb: 'Inicio › Incidencias › Detalle' },
  'lista-reservas':     { title: 'Lista de Reservas',          breadcrumb: 'Inicio › Reservas › Lista' },
  'aprobar-reservas':   { title: 'Gestión de Reserva',         breadcrumb: 'Inicio › Reservas › Gestionar' },
  'reportes':           { title: 'Reportes y Estadísticas',    breadcrumb: 'Inicio › Reportes' }
};

function showPanel(id, navBtn, menuId) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + id);
  if (panel) panel.classList.add('active');
  const info = pageInfo[id] || { title: id, breadcrumb: 'Inicio' };
  document.getElementById('page-title').textContent = info.title;
  document.getElementById('page-breadcrumb').textContent = info.breadcrumb;
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.sub-link').forEach(l => l.classList.remove('active'));
  if (navBtn) navBtn.classList.add('active');
  window.scrollTo(0, 0);
  if (menuId) {
    const sub  = document.getElementById('sub-' + menuId);
    const chev = document.getElementById('chev-' + menuId);
    if (sub && !sub.classList.contains('open')) {
      sub.classList.add('open');
      if (chev) chev.classList.add('open');
    }
  }
  if (id === 'dashboard')         loadDashboard();
    if (id === 'lista-reservas' || id === 'panel-lista-reservas') loadReservas();
  if (id === 'lista-residentes')  loadResidentes();
  if (id === 'panel-usuarios')    loadUsuarios();
  if (id === 'lista-incidencias') loadIncidencias();
  if (id === 'lista-anuncios')    loadAnuncios();
  if (id === 'lista-pagos')       loadPagos();
  if (id === 'historial-pagos')   loadHistorialPagos();
  if (id === 'registrar-pago')    loadResidentesSelect();
  if (id === 'lista-reservas')    loadReservas();
}

function toggleMenu(id) {
  const sub  = document.getElementById('sub-' + id);
  const chev = document.getElementById('chev-' + id);
  const isOpen = sub.classList.contains('open');
  document.querySelectorAll('.submenu').forEach(s => s.classList.remove('open'));
  document.querySelectorAll('.chevron').forEach(c => c.classList.remove('open'));
  if (!isOpen) { sub.classList.add('open'); chev.classList.add('open'); }
}

// ── TOAST ─────────────────────────────────────────────────────
let toastTimer;
function showToast(type, title, msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-msg').textContent   = msg;
  document.getElementById('toast-icon').textContent  = type === 'success' ? '' : '❌';
  t.className = 'toast show ' + (type === 'success' ? 'toast-success' : 'toast-error');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

// ── MODAL ─────────────────────────────────────────────────────
function confirmAction(title, body, onConfirm) {
  document.getElementById('modal-title').textContent = title || 'Confirmar';
  document.getElementById('modal-body').textContent  = body  || '¿Está seguro?';
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-confirm-btn').onclick = () => {
    closeModal();
    if (onConfirm) onConfirm();
    showToast('success', 'Acción completada', 'La operación fue ejecutada correctamente.');
  };
}
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }
function confirmLogout() {
  confirmAction('¿Cerrar sesión?', 'Se cerrará su sesión actual y será redirigido al login.', () => doLogout());
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
  document.getElementById('profile-modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeProfileModal();
  });
  document.getElementById('recibo-modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeReciboModal();
  });
  document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('notif-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      document.getElementById('notif-dropdown').style.display = 'none';
    }
  });
});

// ── TABLE FILTER ──────────────────────────────────────────────
function filterTable(query, tableId) {
  const rows = document.querySelectorAll('#' + tableId + ' tbody tr');
  const q = query.toLowerCase();
  rows.forEach(r => { r.style.display = r.textContent.toLowerCase().includes(q) ? '' : 'none'; });
}

// ── PROFILE MODAL ─────────────────────────────────────────────
function openProfileModal() {
  const user = JSON.parse(sessionStorage.getItem('condoUser') || 'null');
  if (user) {
    const initials = ((user.nombre||'A')[0] + (user.apellido||'P')[0]).toUpperCase();
    document.getElementById('profile-avatar').textContent  = initials;
    document.getElementById('topbar-avatar').textContent   = initials;
    document.getElementById('profile-nombre').textContent  = (user.nombre||'') + ' ' + (user.apellido||'');
    document.getElementById('profile-email').textContent   = user.email || '';
    document.getElementById('profile-rol').textContent     = user.rol == 1 ? 'Administrador' : 'Usuario';
    document.getElementById('topbar-name').textContent     = (user.nombre||'Admin') + ' ' + (user.apellido||'');
    if (user.fechaRegistro) {
      document.getElementById('profile-fecha').textContent =
        new Date(user.fechaRegistro).toLocaleDateString('es-DO', { year: 'numeric', month: 'long' });
    }
  }
  document.getElementById('profile-modal-overlay').classList.add('open');
}
function closeProfileModal() {
  document.getElementById('profile-modal-overlay').classList.remove('open');
}
function doLogout() {
  sessionStorage.removeItem('condoUser');
  showToast('success', 'Sesión cerrada', 'Redirigiendo al inicio de sesión...');
  setTimeout(() => { window.location.href = 'Login.html'; }, 1500);
}

// ── NOTIFICATIONS ─────────────────────────────────────────────
let allNotificaciones = [];

async function loadNotificaciones() {
  try {
    const adminUser = JSON.parse(sessionStorage.getItem('condoUser') || '{}');
    const adminId = adminUser.id || 1;
    const res = await fetch(`${API}/api/notificaciones/${adminId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    allNotificaciones = JSON.parse(text);
    renderNotifDropdown();
  } catch(e) {
    console.error('Notificaciones error:', e);
    const list = document.getElementById('notif-list');
    if (list) list.innerHTML = '<div style="padding:16px;text-align:center;color:#c0392b;font-size:12.5px;">No se pudo conectar con el servidor.</div>';
  }
}

function renderNotifDropdown() {
  const list  = document.getElementById('notif-list');
  const badge = document.getElementById('notif-badge');
  const unread = allNotificaciones.filter(n => !n.Leida);
  badge.textContent = unread.length;
  badge.style.display = unread.length > 0 ? 'flex' : 'none';
  if (!allNotificaciones.length) {
    list.innerHTML = '<div style="padding:24px;text-align:center;color:#8a9ab5;font-size:13px;">No hay notificaciones.</div>';
    return;
  }
  const tipoColor = { general:'#3b9eff', urgente:'#e24b4a', mantenimiento:'#b07800', evento:'#0d7d45', cobro:'#534ab7' };
  list.innerHTML = allNotificaciones.map(n => `
    <div id="notif-item-${n.IdNotificacion}" onclick="marcarLeida(${n.IdNotificacion})"
      style="padding:14px 18px;border-bottom:0.5px solid #eef1f6;cursor:pointer;background:${n.Leida?'#fff':'#f5f9ff'};transition:background 0.15s;"
      onmouseover="this.style.background='#f0f4f9'" onmouseout="this.style.background='${n.Leida?'#fff':'#f5f9ff'}'">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
        <span style="width:8px;height:8px;border-radius:50%;background:${n.Leida?'transparent':'#3b9eff'};flex-shrink:0;"></span>
        <div style="font-size:13px;font-weight:${n.Leida?'500':'700'};color:#0f2d52;flex:1;">${n.Titulo}</div>
        <span style="font-size:10px;padding:2px 8px;border-radius:20px;background:${(tipoColor[n.Tipo]||'#8a9ab5')}22;color:${tipoColor[n.Tipo]||'#8a9ab5'};font-weight:600;">${n.Tipo}</span>
      </div>
      <div style="font-size:12px;color:#6b7c93;padding-left:16px;">${(n.Mensaje||'').substring(0,80)}${n.Mensaje&&n.Mensaje.length>80?'...':''}</div>
      <div style="font-size:11px;color:#aab4c2;margin-top:4px;padding-left:16px;">${n.FechaCreacion?new Date(n.FechaCreacion).toLocaleString('es-DO'):''}</div>
    </div>`).join('');
}

async function marcarLeida(id) {
  try {
    await fetch(`${API}/api/notificaciones/${id}/leer`, { method: 'PUT' });
    const n = allNotificaciones.find(x => x.IdNotificacion === id);
    if (n) n.Leida = true;
    renderNotifDropdown();
  } catch(e) {
     console.error(e); }
}

async function marcarTodasLeidas() {
  for (const n of allNotificaciones.filter(n => !n.Leida)) {
    await fetch(`${API}/api/notificaciones/${n.IdNotificacion}/leer`, { method: 'PUT' });
    n.Leida = true;
  }
  renderNotifDropdown();
  showToast('success', 'Notificaciones', 'Todas marcadas como leídas.');
}

function toggleNotifDropdown() {
  console.log("Toggling notif dropdown...");
  const dd = document.getElementById('notif-dropdown');
  const isOpen = dd.classList.contains("open-dropdown");
  if (isOpen) { dd.style.display = 'none'; dd.classList.remove("open-dropdown"); } else { dd.style.display = 'block'; dd.classList.add("open-dropdown"); loadNotificaciones(); }
  loadNotificaciones();
}

// ── RESIDENTES ────────────────────────────────────────────────
async function loadResidentes() {
  const tbody = document.getElementById('res-tbody');
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#8a9ab5;padding:20px;">Cargando...</td></tr>';
  try {
    const res  = await fetch(API + '/api/residentes');
    const data = await res.json();
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#8a9ab5;padding:24px;">No hay residentes registrados todavía.</td></tr>';
      return;
    }
    const estadoBadge = { 'Activo':'badge-green', 'Moroso':'badge-yellow', 'Inactivo':'badge-gray' };
    const colors = ['#1a6fc4','#0d7d45','#b07800','#c0392b','#534ab7','#0f2d52'];
    tbody.innerHTML = data.map((r, i) => {
      const initials = ((r.Nombre||'?')[0] + (r.Apellido||'?')[0]).toUpperCase();
      const color    = colors[i % colors.length];
      const badge    = estadoBadge[r.Estado] || 'badge-gray';
      return `<tr style="cursor:pointer;" onclick="verPerfilResidente(${r.IdResidente})">
        <td><div style="display:flex;align-items:center;gap:10px;">
          <div class="avatar" style="width:34px;height:34px;font-size:11px;background:${color};">${initials}</div>
          <div><div style="font-weight:600;font-size:13.5px;">${r.Nombre} ${r.Apellido||''}</div>
          <div style="font-size:11.5px;color:#8a9ab5;">Apto ${r.Apartamento||'—'}</div></div>
        </div></td>
        <td>${r.Apartamento||'—'}</td>
        <td>${r.Telefono||'—'}</td>
        <td>${r.Email||'—'}</td>
        <td><span class="badge ${badge}">${r.Estado||'Activo'}</span></td>
        <td><div style="display:flex;gap:6px;" onclick="event.stopPropagation()">
          <button class="btn-secondary btn-sm" onclick="verPerfilResidente(${r.IdResidente})">Ver</button>
          <button class="btn-secondary btn-sm" onclick="editarResidente(${r.IdResidente})">Editar</button>
        </div></td>
      </tr>`;
    }).join('');
  } catch(e) {
    
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#c0392b;padding:20px;">Error: ${e.message}</td></tr>`;
  }
}

let currentResidenteId = null;

function prepararNuevoResidente() {
  currentResidenteId = null;
  ['res-nombre','res-apellido','res-cedula','res-telefono','res-correo','res-apto','res-piso','res-notas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('res-estado').value   = 'Activo';
  document.getElementById('res-contrato').value = 'Propietario';
  const fi = document.getElementById('res-fecha-ingreso');
  if (fi) fi.value = '';
  document.querySelector('#panel-crear-residente [style*="font-size:20px"]').textContent = 'Nuevo Residente';
  showPanel('crear-residente', null, 'residentes');
}

async function verPerfilResidente(id) {
  currentResidenteId = id;
  try {
    const res = await fetch(`${API}/api/residentes/${id}`);
    const r   = await res.json();
    showPanel('perfil-residente', null, 'residentes');
    
    const initials = ((r.Nombre||'?')[0] + (r.Apellido||'?')[0]).toUpperCase();
    const estadoBadge = { 'Activo':'badge-green', 'Moroso':'badge-yellow', 'Inactivo':'badge-gray' };
    
    // Card principal
    const av = document.getElementById('perfil-avatar');
    if (av) { av.textContent = initials; av.style.background = ['#1a6fc4','#0d7d45','#b07800','#c0392b','#534ab7'][id % 5]; }
    const set = (elId, val) => { const el = document.getElementById(elId); if (el) el.textContent = val || '--'; };
    set('perfil-nombre', `${r.Nombre} ${r.Apellido||''}`);
    set('perfil-apto', `Apartamento ${r.Apartamento||'--'} · Piso ${r.Piso||'--'}`);
    set('perfil-telefono', r.Telefono);
    set('perfil-email', r.Email);
    set('perfil-cedula', r.Cedula);
    set('perfil-desde', r.FechaIngreso ? 'Desde ' + new Date(r.FechaIngreso).toLocaleDateString('es-DO', {month:'long', year:'numeric'}) : '--');
    const badge = document.getElementById('perfil-estado-badge');
    if (badge) { badge.textContent = r.Estado||'Activo'; badge.className = 'badge '+(estadoBadge[r.Estado]||'badge-gray'); }
    
    // Pagos del residente
    const pagosTbody = document.getElementById('perfil-pagos-tbody');
    if (pagosTbody) {
      pagosTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#8a9ab5;padding:16px;">Cargando...</td></tr>';
      try {
        const pr = await fetch(`${API}/api/residente/pagos/${id}`);
        const pagos = await pr.json();
        const badgePago = { pagado:'badge-green', pendiente:'badge-yellow', vencido:'badge-red' };
        pagosTbody.innerHTML = pagos.length
          ? pagos.map(p => `<tr>
              <td>${p.FechaPago ? new Date(p.FechaPago).toLocaleDateString('es-DO', {month:'long', year:'numeric'}) : '--'}</td>
              <td>${p.Concepto||'Mantenimiento'}</td>
              <td>RD$${parseFloat(p.Monto||0).toLocaleString('es-DO')}</td>
              <td><span class="badge ${badgePago[(p.Estado||'').toLowerCase()]||'badge-gray'}">${p.Estado||'--'}</span></td>
              <td>${p.FechaPago ? new Date(p.FechaPago).toLocaleDateString('es-DO') : '--'}</td>
            </tr>`).join('')
          : '<tr><td colspan="5" style="text-align:center;color:#8a9ab5;padding:16px;">Sin pagos registrados.</td></tr>';
      } catch { pagosTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#c0392b;">Error cargando pagos.</td></tr>'; }
    }
    
    // Reservas del residente
    const resList = document.getElementById('perfil-reservas-list');
    if (resList) {
      resList.innerHTML = '<div style="font-size:13px;color:#8a9ab5;">Cargando...</div>';
      try {
        const rr = await fetch(`${API}/api/reservas`);
        const reservas = (await rr.json()).filter(rv => rv.ResidenteId === id || rv.UsuarioId === id);
        const areaIcons = { salon: '\uD83C\uDFDB', piscina: '\uD83C\uDFCA', gym: '\uD83C\uDFCB', terraza: '\uD83C\uDF04' };
        resList.innerHTML = reservas.length
          ? reservas.slice(0, 5).map(rv => {
              const icon = areaIcons[(rv.Area||'').toLowerCase()] || '\uD83D\uDCC5';
              const badgeCls = rv.Estado === 'Aprobada' ? 'badge-green' : rv.Estado === 'Rechazada' ? 'badge-red' : 'badge-yellow';
              return `<div style="font-size:13px;color:#4a5a72;padding:8px 0;border-bottom:0.5px solid #eef1f6;">${icon} ${rv.Area||'--'} · ${rv.Fecha||'--'} · <span class="badge ${badgeCls}">${rv.Estado||'--'}</span></div>`;
            }).join('')
          : '<div style="font-size:13px;color:#8a9ab5;">Sin reservas recientes.</div>';
      } catch { resList.innerHTML = '<div style="font-size:13px;color:#c0392b;">Error cargando reservas.</div>'; }
    }
  } catch(e) {
    
    showToast('error', 'Error', 'No se pudo cargar el perfil.');
  }
}

async function editarResidente(id) {
  currentResidenteId = id;
  try {
    const res = await fetch(`${API}/api/residentes/${id}`);
    const r   = await res.json();
    // Show the panel FIRST so the elements exist in the DOM
    showPanel('crear-residente', null, 'residentes');
    // Then populate all fields
    document.getElementById('res-nombre').value    = r.Nombre   || '';
    document.getElementById('res-apellido').value  = r.Apellido || '';
    document.getElementById('res-cedula').value    = r.Cedula   || '';
    document.getElementById('res-telefono').value  = r.Telefono || '';
    document.getElementById('res-correo').value    = r.Email    || '';
    document.getElementById('res-apto').value      = r.Apartamento || '';
    document.getElementById('res-piso').value      = r.Piso || '';
    document.getElementById('res-notas').value     = r.Notas   || '';
    if (r.Estado)   document.getElementById('res-estado').value   = r.Estado;
    if (r.Tipo)     document.getElementById('res-contrato').value = r.Tipo;
    const fi = document.getElementById('res-fecha-ingreso');
    if (fi && r.FechaIngreso) fi.value = r.FechaIngreso.substring(0, 10);
    document.querySelector('#panel-crear-residente [style*="font-size:20px"]').textContent = 'Editar Residente';
  } catch(e) {
    
    showToast('error', 'Error', 'No se pudo cargar el residente.');
  }
}

async function submitResidente() {
  const body = {
    nombre:       document.getElementById('res-nombre').value.trim(),
    apellido:     document.getElementById('res-apellido').value.trim(),
    cedula:       document.getElementById('res-cedula').value.trim(),
    telefono:     document.getElementById('res-telefono').value.trim(),
    correo:       document.getElementById('res-correo').value.trim(),
    apartamento:  document.getElementById('res-apto').value.trim(),
    piso:         document.getElementById('res-piso').value || null,
    estado:       document.getElementById('res-estado').value,
    contrato:     document.getElementById('res-contrato').value,
    fechaIngreso: document.getElementById('res-fecha-ingreso').value || null,
    notas:        document.getElementById('res-notas').value.trim()
  };
  if (!body.nombre || !body.apellido) {
    showToast('error', 'Campos requeridos', 'Nombre y apellido son obligatorios.'); return;
  }
  const url    = currentResidenteId ? `${API}/api/residentes/${currentResidenteId}` : `${API}/api/residentes`;
  const method = currentResidenteId ? 'PUT' : 'POST';
  try {
    const res  = await fetch(url, { method, headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) {
      showToast('success', 'Residente guardado', data.message);
      currentResidenteId = null;
      loadDashboard();
      setTimeout(() => showPanel('lista-residentes', null, 'residentes'), 800);
    } else { showToast('error', 'Error', data.message); }
  } catch(e) {
     showToast('error', 'Error de conexión', 'No se pudo conectar con el servidor.'); }
}

// ── DASHBOARD ────────────────────────────────────────────────
async function loadDashboard() {
  console.log("Iniciando loadDashboard...");
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('dash-total-residentes', '...');
  set('dash-pagos-pendientes', '...');
  set('dash-incidencias-activas', '...');
  
  try {
    const res  = await fetch(API + '/api/dashboard');
    const d    = await res.json();
    set('dash-total-residentes',    d.totalResidentes    ?? '--');
    set('dash-pagos-pendientes',    d.pagosPendientes    ?? '--');
    set('dash-incidencias-activas', d.incidenciasActivas ?? '--');
    const rec = d.recaudacionMes ?? 0;
    set('dash-recaudacion', 'RD$' + rec.toLocaleString('es-DO', {minimumFractionDigits:0}));
    // Actividad reciente
    const act = document.getElementById('dash-actividad');
    if (act && d.ultimosResidentes && d.ultimosResidentes.length) {
      act.innerHTML = d.ultimosResidentes.map(r => `
        <div class="timeline-item">
          <div class="timeline-dot" style="background:#f0f4f9;"></div>
          <div>
            <div style="font-size:13.5px;font-weight:600;color:#1a2a3a;">Residente registrado</div>
            <div style="font-size:12px;color:#8a9ab5;">${r.Nombre} ${r.Apellido||''} · Apto ${r.Apartamento||'—'}${r.FechaIngreso ? ' · ' + new Date(r.FechaIngreso).toLocaleDateString('es-DO') : ''}</div>
          </div>
        </div>`).join('');
    }
    // Conteo en lista de residentes
    const rl = document.getElementById('res-count-label');
    if (rl) rl.textContent = (d.totalResidentes ?? 0) + ' residentes registrados';
  } catch(e) {
     console.error('Dashboard error:', e); }
}

// ── PAGOS ────────────────────────────────────────────────────
async function loadResidentesSelect() {
  try {
    const res  = await fetch(API + '/api/residentes');
    const data = await res.json();
    const sel  = document.getElementById('pago-residente-id');
    if (!sel) return;
    sel.innerHTML = '<option value="">Seleccionar residente...</option>' +
      data.map(r => `<option value="${r.IdResidente}" data-nombre="${r.Nombre} ${r.Apellido||''} – Apto ${r.Apartamento||'—'}">${r.Nombre} ${r.Apellido||''} – Apto ${r.Apartamento||'—'}</option>`).join('');
    // Hook live preview
    setupReceiptPreview();
  } catch(e) {
     console.warn('No se cargaron residentes para pagos:', e.message); }
}

function setupReceiptPreview() {
  const fields = ['pago-residente-id','pago-concepto','pago-monto','pago-fecha','pago-metodo','pago-referencia'];
  fields.forEach(fid => {
    const el = document.getElementById(fid);
    if (el) el.addEventListener('input', updateReceiptPreview);
    if (el) el.addEventListener('change', updateReceiptPreview);
  });
}

function updateReceiptPreview() {
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
  // Residente
  const resSel = document.getElementById('pago-residente-id');
  const resText = resSel && resSel.selectedIndex > 0 ? resSel.options[resSel.selectedIndex].text : '—';
  setText('prev-residente', resText);
  // Concepto
  const concepto = document.getElementById('pago-concepto');
  setText('prev-concepto', concepto ? concepto.value : '—');
  // Fecha
  const fecha = document.getElementById('pago-fecha');
  setText('prev-fecha', fecha && fecha.value ? new Date(fecha.value + 'T12:00:00').toLocaleDateString('es-DO') : '—');
  // Método
  const metodo = document.getElementById('pago-metodo');
  setText('prev-metodo', metodo ? metodo.value : '—');
  // Referencia
  const ref = document.getElementById('pago-referencia');
  setText('prev-ref', ref && ref.value ? ref.value : '—');
  // Monto
  const montoEl = document.getElementById('pago-monto');
  const monto = parseFloat(montoEl ? montoEl.value : 0) || 0;
  setText('prev-monto', 'RD$' + monto.toLocaleString('es-DO', { minimumFractionDigits: 2 }));
}

async function loadPagos() {
  const tbody = document.getElementById('pagos-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#8a9ab5;padding:20px;">Cargando...</td></tr>';
  try {
    const res  = await fetch(API + '/api/pagos');
    let data = await res.json();
    if (!Array.isArray(data) || !data.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#8a9ab5;padding:24px;">No hay pagos registrados.</td></tr>';
      return;
    }

    // Filtro por estado
    const filtroEstado = document.getElementById('pago-filtro-estado')?.value;
    if (filtroEstado) {
      data = data.filter(p => (p.Estado || '').toLowerCase() === filtroEstado.toLowerCase());
    }

    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#8a9ab5;padding:24px;">No hay pagos que coincidan con el filtro.</td></tr>';
      return;
    }

    const badge = { pagado:'badge-green', pendiente:'badge-yellow', vencido:'badge-red' };
    const capEst = e => e ? e.charAt(0).toUpperCase()+e.slice(1) : '—';
    tbody.innerHTML = data.map(p => `<tr>
      <td><span style="font-weight:600;">${p.Nombre||''} ${p.Apellido||''}</span></td>
      <td>${p.Apartamento||'—'}</td>
      <td>${p.Concepto||'—'}</td>
      <td>RD$${Number(p.Monto||0).toLocaleString('es-DO')}</td>
      <td>${p.FechaPago ? new Date(p.FechaPago).toLocaleDateString('es-DO') : '—'}</td>
      <td><span class="badge ${badge[p.Estado]||'badge-gray'}">${capEst(p.Estado)}</span></td>
      <td><button class="btn-secondary btn-sm" onclick='verRecibo(${JSON.stringify(p)})'>Ver recibo</button></td>
    </tr>`).join('');
  } catch(e) {
    
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#c0392b;padding:20px;">Error: ${e.message}</td></tr>`;
  }
}

function verRecibo(p) {
  const fmt = (v) => v || '—';
  const fmtFecha = (f) => f ? new Date(f).toLocaleDateString('es-DO', {day:'2-digit', month:'long', year:'numeric'}) : '—';
  const fmtMonto = (m) => 'RD$' + Number(m||0).toLocaleString('es-DO', {minimumFractionDigits:2});
  const estadoColor = { pagado:'#0d7d45', pendiente:'#b07800', vencido:'#c0392b' };
  const color = estadoColor[(p.Estado||'').toLowerCase()] || '#8a9ab5';
  document.getElementById('recibo-modal-content').innerHTML = `
    <div style="text-align:center;padding-bottom:18px;border-bottom:1px dashed #dde5ef;margin-bottom:18px;">
      <div style="font-size:22px;font-weight:800;color:#0f2d52;">Edificio Residencial</div>
      <div style="font-size:12px;color:#8a9ab5;margin-top:2px;">Comprobante de Pago Oficial</div>
      <div style="display:inline-block;margin-top:10px;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;background:${color}22;color:${color};">${(p.Estado||'').toUpperCase()}</div>
    </div>
    <div style="font-size:11px;font-weight:700;color:#8a9ab5;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Datos del residente</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin-bottom:18px;">
      <div><div style="font-size:11px;color:#aab4c2;">Nombre</div><div style="font-size:13.5px;font-weight:600;color:#1a2a3a;">${fmt(p.Nombre)} ${fmt(p.Apellido)}</div></div>
      <div><div style="font-size:11px;color:#aab4c2;">Apartamento</div><div style="font-size:13.5px;font-weight:600;color:#1a2a3a;">${fmt(p.Apartamento)}</div></div>
    </div>
    <div style="font-size:11px;font-weight:700;color:#8a9ab5;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Detalles del pago</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin-bottom:18px;">
      <div><div style="font-size:11px;color:#aab4c2;">N Recibo</div><div style="font-size:13.5px;font-weight:600;color:#1a2a3a;">#PAG-${String(p.IdPago||0).padStart(5,'0')}</div></div>
      <div><div style="font-size:11px;color:#aab4c2;">Concepto</div><div style="font-size:13.5px;font-weight:600;color:#1a2a3a;">${fmt(p.Concepto)}</div></div>
      <div><div style="font-size:11px;color:#aab4c2;">Fecha</div><div style="font-size:13.5px;font-weight:600;color:#1a2a3a;">${fmtFecha(p.FechaPago)}</div></div>
      <div><div style="font-size:11px;color:#aab4c2;">Metodo</div><div style="font-size:13.5px;font-weight:600;color:#1a2a3a;">${fmt(p.MetodoPago)}</div></div>
      <div style="grid-column:span 2;"><div style="font-size:11px;color:#aab4c2;">Referencia</div><div style="font-size:13.5px;font-weight:600;color:#1a2a3a;">${fmt(p.Referencia)}</div></div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:#f0f4f9;border-radius:10px;margin-bottom:18px;">
      <span style="font-size:14px;font-weight:700;color:#0f2d52;">TOTAL PAGADO</span>
      <span style="font-size:24px;font-weight:800;color:#0f2d52;">${fmtMonto(p.Monto)}</span>
    </div>
    <div style="text-align:center;font-size:11px;color:#aab4c2;border-top:1px dashed #dde5ef;padding-top:14px;">
      Generado el ${new Date().toLocaleDateString('es-DO')} - CondoManager
    </div>
  `;
  document.getElementById('recibo-modal-overlay').classList.add('open');
}
function closeReciboModal() {
  document.getElementById('recibo-modal-overlay').classList.remove('open');
}

async function loadHistorialPagos() {
  const tbody = document.getElementById('historial-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#8a9ab5;padding:20px;">Cargando...</td></tr>';
  try {
    const res  = await fetch(API + '/api/pagos');
    let data = await res.json();
    if (!Array.isArray(data) || !data.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#8a9ab5;padding:24px;">No hay registros.</td></tr>';
      return;
    }

    // Filtro por mes (YYYY-MM)
    const filtroMes = document.getElementById('historial-filtro-mes')?.value;
    if (filtroMes) {
      data = data.filter(p => p.FechaPago && p.FechaPago.substring(0, 7) === filtroMes);
    }

    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#8a9ab5;padding:24px;">No hay registros para este mes.</td></tr>';
      return;
    }

    const badge = { Pagado:'badge-green', Pendiente:'badge-yellow', Vencido:'badge-red' };
    tbody.innerHTML = data.map((p, i) => `<tr>
      <td style="color:#8a9ab5;">#${String(p.IdPago).padStart(4,'0')}</td>
      <td>${p.Nombre||''} ${p.Apellido||''}</td>
      <td>${p.Apartamento||'—'}</td>
      <td>${p.Concepto||'—'}</td>
      <td>RD$${Number(p.Monto||0).toLocaleString('es-DO')}</td>
      <td>${p.MetodoPago||'—'}</td>
      <td>${p.FechaPago ? new Date(p.FechaPago).toLocaleDateString('es-DO') : '—'}</td>
      <td><span class="badge ${badge[p.Estado]||'badge-gray'}">${p.Estado||'—'}</span></td>
    </tr>`).join('');
  } catch(e) {
    
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#c0392b;padding:20px;">Error: ${e.message}</td></tr>`;
  }
}

async function submitPago() {
  const get = id => { const el = document.getElementById(id); return el ? el.value : ''; };
  const body = {
    residente_id:  get('pago-residente-id') || null,
    monto:         get('pago-monto'),
    metodo_pago:   get('pago-metodo'),
    fecha_pago:    get('pago-fecha') || null,
    estado:        'pagado',
    notas:         get('pago-notas')
  };
  if (!body.residente_id || !body.monto) {
    showToast('error', 'Campos requeridos', 'Residente y monto son obligatorios.'); return;
  }
  try {
    const res  = await fetch(API + '/api/pagos', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) {
      showToast('success', 'Pago registrado', data.message);
      loadDashboard();
      ['pago-residente-id','pago-monto','pago-metodo','pago-referencia','pago-fecha','pago-vencimiento','pago-notas'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
      setTimeout(() => showPanel('lista-pagos', null, 'pagos'), 800);
    } else { showToast('error', 'Error', data.message); }
  } catch(e) {
     showToast('error', 'Error de conexión', 'No se pudo conectar con el servidor.'); }
}

// ── NOTIFICACIÓN FORM ─────────────────────────────────────────
async function submitNotificacion() {
  const titulo  = (document.getElementById('notif-titulo')?.value  || '').trim();
  const mensaje = (document.getElementById('notif-mensaje')?.value || '').trim();
  const tipo    = document.getElementById('notif-tipo')?.value || 'general';
  if (!titulo || !mensaje) { showToast('error', 'Campos requeridos', 'Título y mensaje son obligatorios.'); return; }
  try {
    const res  = await fetch(API + '/api/notificaciones', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ titulo, mensaje, tipo })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('success', 'Notificación enviada', data.message);
      document.getElementById('notif-titulo').value  = '';
      document.getElementById('notif-mensaje').value = '';
    } else { showToast('error', 'Error', data.message); }
  } catch(e) {
     showToast('error', 'Error de conexión', 'No se pudo conectar con el servidor.'); }
}
function updateNotifPreview() { /* live preview placeholder */ }

// ── INCIDENCIAS ───────────────────────────────────────────────
let currentIncidenciaId = null;

async function loadIncidencias() {
  const container = document.getElementById('inc-lista-container');
  if (!container) return;
  container.innerHTML = '<div style="padding:24px;text-align:center;color:#8a9ab5;">Cargando incidencias...</div>';
  
  try {
    const res  = await fetch(API + '/api/incidencias');
    const data = await res.json();
    
    if (!data || !data.length) {
      container.innerHTML = '<div style="background:#fff;border-radius:12px;padding:32px;text-align:center;color:#8a9ab5;">No hay incidencias registradas.</div>';
      return;
    }

    const estadoBadge = { 'abierta':'badge-red', 'en_proceso':'badge-yellow', 'resuelta':'badge-green', 'cerrada':'badge-gray' };
    const estadoIcon  = { 'abierta':'🚨', 'en_proceso':'', 'resuelta':'', 'cerrada':'📁' };
    const iconBg      = { 'abierta':'#fff0f0', 'en_proceso':'#fff8e6', 'resuelta':'#e6f7ee', 'cerrada':'#f0f4f9' };
    const prioBorder  = { 'Alta':'#fad0d0', 'Media':'#ffe99a', 'Baja':'#dde5ef' };
    
    const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ') : '—';

    container.innerHTML = data.map(inc => {
      const bColor = prioBorder[inc.Prioridad] || '#dde5ef';
      const status = inc.Estado || 'abierta';
      
      return `
      <div style="background:#fff;border-radius:12px;border:0.5px solid ${bColor};padding:20px;cursor:pointer;margin-bottom:12px;"
        onclick="abrirDetalleIncidencia(${inc.IdIncidencia})"
        onmouseover="this.style.boxShadow='0 4px 16px rgba(15,45,82,0.09)'"
        onmouseout="this.style.boxShadow='none'">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:42px;height:42px;background:${iconBg[status]||'#f0f4f9'};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">${estadoIcon[status]||''}</div>
            <div>
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
                <div style="font-size:14px;font-weight:700;color:#0f2d52;">${inc.Titulo}</div>
                <span class="badge ${estadoBadge[status]||'badge-gray'}">${cap(status)}</span>
              </div>
              <div style="font-size:12.5px;color:#8a9ab5;">
                Reportado por: <strong>${inc.ResidenteNombre || 'Anónimo'}</strong> · Apto ${inc.Apartamento || '—'}
                <br>
                <span style="font-size:11.5px;"> ${inc.Ubicacion || 'No especificada'} ·  ${inc.FechaReporte ? new Date(inc.FechaReporte).toLocaleString('es-DO') : ''}</span>
              </div>
            </div>
          </div>
          <button class="btn-secondary btn-sm" onclick="event.stopPropagation();abrirDetalleIncidencia(${inc.IdIncidencia})">Ver detalle →</button>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    
    console.error("Error al cargar incidencias:", e);
    container.innerHTML = `<div style="background:#fff;border-radius:12px;padding:24px;text-align:center;color:#c0392b;">Error al conectar con el servidor.</div>`;
  }
}

async function abrirDetalleIncidencia(id) {
  currentIncidenciaId = id;
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  
  try {
    const res  = await fetch(API + '/api/incidencias');
    const list = await res.json();
    const inc  = list.find(x => x.IdIncidencia === id);
    
    if (inc) {
      const estadoIcon  = { 'abierta':'🚨', 'en_proceso':'', 'resuelta':'', 'cerrada':'📁' };
      const estadoBadge = { 'abierta':'badge-red', 'en_proceso':'badge-yellow', 'resuelta':'badge-green', 'cerrada':'badge-gray' };
      const iconBg      = { 'abierta':'#fff0f0', 'en_proceso':'#fff8e6', 'resuelta':'#e6f7ee', 'cerrada':'#f0f4f9' };
      const border      = { 'Alta':'#fad0d0', 'Media':'#ffe99a', 'Baja':'#dde5ef' };
      const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ') : '—';

      set('inc-detalle-num', 'Detalle de Incidencia #INC-' + String(id).padStart(3, '0'));
      set('inc-detalle-titulo', (estadoIcon[inc.Estado]||'') + ' ' + inc.Titulo);
      set('inc-detalle-reportado', (inc.ResidenteNombre || 'Anónimo') + ' · Apto ' + (inc.Apartamento || '—'));
      set('inc-detalle-fecha', inc.FechaReporte ? new Date(inc.FechaReporte).toLocaleString('es-DO') : '—');
      set('inc-detalle-ubicacion', inc.Ubicacion || 'No especificada');
      set('inc-detalle-prioridad', inc.Prioridad || 'Normal');
      set('inc-detalle-descripcion', inc.Descripcion || 'Sin descripción detallada.');
      
      const badge = document.getElementById('inc-detalle-badge');
      if (badge) {
        badge.textContent = cap(inc.Estado);
        badge.className = 'badge ' + (estadoBadge[inc.Estado] || 'badge-gray');
      }
      
      const card = document.getElementById('inc-detalle-card');
      if (card) {
        card.style.borderColor = border[inc.Prioridad] || '#dde5ef';
      }
    }
  } catch(e) {
     console.error("Error al cargar detalle:", e); }
  showPanel('detalle-incidencia', null, 'incidencias');
}

async function cambiarEstadoIncidencia(nuevoEstado) {
  if (!currentIncidenciaId) { showToast('error', 'Error', 'Selecciona una incidencia desde la lista.'); return; }
  try {
    const res  = await fetch(`${API}/api/incidencias/${currentIncidenciaId}/estado`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ estado: nuevoEstado })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('success', 'Estado actualizado', data.message);
      const badgeEl = document.querySelector('#panel-detalle-incidencia .badge');
      if (badgeEl) {
        const estadoBadge = { 'Abierta':'badge-red', 'En proceso':'badge-yellow', 'Resuelta':'badge-green' };
        badgeEl.textContent = nuevoEstado;
        badgeEl.className   = 'badge ' + (estadoBadge[nuevoEstado] || 'badge-gray');
      }
    } else { showToast('error', 'Error', data.message); }
  } catch(e) {
     showToast('error', 'Error de conexión', 'No se pudo conectar con el servidor.'); }
}

async function submitIncidencia() {
  const titulo      = (document.getElementById('inc-titulo')?.value      || '').trim();
  const descripcion = (document.getElementById('inc-descripcion')?.value || '').trim();
  const ubicacion   = (document.getElementById('inc-ubicacion')?.value   || '').trim();
  const prioridad   = document.getElementById('inc-prioridad')?.value    || 'Normal';
  if (!titulo) { showToast('error', 'Campo requerido', 'El título es obligatorio.'); return; }
  try {
    const res  = await fetch(API + '/api/incidencias', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ titulo, descripcion, ubicacion, prioridad })
    });
    const data = await res.json();
    if (res.ok) {
      showToast('success', 'Incidencia creada', data.message);
      ['inc-titulo','inc-descripcion','inc-ubicacion'].forEach(id => { const el = document.getElementById(id); if (el) el.value=''; });
      setTimeout(() => showPanel('lista-incidencias', null, 'incidencias'), 800);
    } else { showToast('error', 'Error', data.message); }
  } catch(e) {
     showToast('error', 'Error de conexión', 'No se pudo conectar con el servidor.'); }
}

// ── ANUNCIOS ──────────────────────────────────────────────────
async function loadAnuncios() {
  const container = document.querySelector('#panel-lista-anuncios > div:last-child');
  if (!container) return;
  try {
    const adminUser = JSON.parse(sessionStorage.getItem('condoUser') || '{}');
    const adminId = adminUser.id || 1;
    const res  = await fetch(`${API}/api/notificaciones/${adminId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.length) {
      container.innerHTML = '<div style="background:#fff;border-radius:12px;padding:32px;text-align:center;color:#8a9ab5;">No hay anuncios creados aún.</div>';
      return;
    }
    const tipoColor = { anuncio:'#0d7d45', incidencia:'#e24b4a', reserva:'#3b9eff', pago:'#534ab7', otro:'#b07800' };
    const tipoBadge = { anuncio:'badge-green', incidencia:'badge-red', reserva:'badge-blue', pago:'badge-navy', otro:'badge-yellow' };
    const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
    container.innerHTML = data.map(n => `
      <div style="background:#fff;border-radius:12px;border:0.5px solid #dde5ef;padding:20px;border-left:4px solid ${tipoColor[n.Tipo]||'#3b9eff'};margin-bottom:12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;"><span class="badge ${tipoBadge[n.Tipo]||'badge-gray'}">${cap(n.Tipo)}</span><div style="font-size:14px;font-weight:700;color:#0f2d52;">${n.Titulo}</div></div>
          <div style="font-size:12px;color:#8a9ab5;">${n.FechaCreacion?new Date(n.FechaCreacion).toLocaleString('es-DO'):''}</div>
        </div>
        <div style="font-size:13.5px;color:#4a5a72;margin-bottom:10px;">${n.Mensaje||''}</div>
        <span style="font-size:12px;color:#8a9ab5;">${n.Leida?' Leída':'🔵 Sin leer'}</span>
      </div>`).join('');
  } catch(e) {
     /* silent */ }
}

// ── USUARIOS ──────────────────────────────────────────────────
async function loadUsuarios() {
  const tbody = document.getElementById('usuarios-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#8a9ab5;padding:20px;">Cargando...</td></tr>';
  try {
    const res  = await fetch(API + '/api/usuarios');
    const data = await res.json();
    if (!data.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#8a9ab5;padding:24px;">No hay usuarios.</td></tr>';
      return;
    }
    tbody.innerHTML = data.map(u => `<tr>
      <td><span style="font-weight:600;">${u.nombre} ${u.apellido||''}</span></td>
      <td>${u.email}</td>
      <td>${u.telefono||'—'}</td>
      <td>
        <select class="form-input form-select" style="padding:4px 8px;font-size:12px;width:120px;" onchange="updateUserRole(${u.id}, this.value)">
          <option value="residente" ${u.rol==='residente'?'selected':''}>Residente</option>
          <option value="admin" ${u.rol==='admin'?'selected':''}>Admin</option>
        </select>
      </td>
      <td><span class="badge ${u.activo?'badge-green':'badge-gray'}">${u.activo?'Activo':'Inactivo'}</span></td>
      <td><button class="btn-secondary btn-sm" onclick="toggleUserStatus(${u.id}, ${u.activo?0:1})">${u.activo?'Desactivar':'Activar'}</button></td>
    </tr>`).join('');
  } catch(e) {
    
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#c0392b;padding:20px;">Error: ${e.message}</td></tr>`;
  }
}

async function updateUserRole(id, rol) {
  try {
    const res = await fetch(`${API}/api/usuarios/${id}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ rol })
    });
    const data = await res.json();
    if (res.ok) { showToast('success', 'Usuario actualizado', data.message); }
    else { showToast('error', 'Error', data.message); }
  } catch(e) {
     showToast('error', 'Error de conexión', 'No se pudo actualizar el rol.'); }
}

async function toggleUserStatus(id, activo) {
  try {
    const res = await fetch(`${API}/api/usuarios/${id}`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ activo })
    });
    if (res.ok) { loadUsuarios(); showToast('success', 'Estado actualizado', 'El estado del usuario ha sido cambiado.'); }
  } catch(e) {
     showToast('error', 'Error', 'No se pudo cambiar el estado.'); }
}

// ── RESERVAS ──────────────────────────────────────────────────
let allReservas = [];

async function loadReservas() {
  const tbody = document.getElementById('reservas-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#8a9ab5;padding:20px;">Cargando reservas...</td></tr>';
  try {
    const res  = await fetch(API + '/api/reservas');
    const text = await res.text(); try { allReservas = JSON.parse(text); } catch(err) { console.error("Raw response:", text);  throw new Error("Error HTML"); }
    if (!allReservas.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#8a9ab5;padding:24px;">No hay reservas registradas.</td></tr>';
      return;
    }
    const badge = { pendiente:'badge-yellow', aprobada:'badge-green', rechazada:'badge-red' };
    tbody.innerHTML = allReservas.map(r => `<tr>
      <td><span style="font-weight:600;">${r.ResidenteNombre||'Anónimo'}</span></td>
      <td>${r.Area||'—'}</td>
      <td>${r.Fecha ? new Date(r.Fecha).toLocaleDateString('es-DO') : '—'}</td>
      <td>${r.Hora||'—'}</td>
      <td>—</td>
      <td><span class="badge ${badge[r.Estado]||'badge-gray'}">${r.Estado}</span></td>
      <td>
        <button class="${r.Estado==='pendiente'?'btn-accent':'btn-secondary'} btn-sm" onclick="abrirGestionReserva(${r.IdReserva})">
          ${r.Estado==='pendiente'?'Revisar':'Gestionar'}
        </button>
      </td>
    </tr>`).join('');
  } catch(e) {
    
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#c0392b;padding:20px;">Error: ${e.message}</td></tr>`;
  }
}

function abrirGestionReserva(id) {
  const r = allReservas.find(x => x.IdReserva === id);
  if (!r) return;
  
  document.getElementById('res-gestion-titulo').textContent = 'Gestión de Reserva #RES-' + String(id).padStart(3, '0');
  document.getElementById('res-gestion-nombre').textContent = r.ResidenteNombre || 'Anónimo';
  document.getElementById('res-gestion-apto').textContent   = 'Apto ' + (r.Apartamento || '—');
  document.getElementById('res-gestion-area').textContent   = r.Area || '—';
  document.getElementById('res-gestion-fecha').textContent     = r.Fecha ? new Date(r.Fecha).toLocaleDateString('es-DO', {day:'numeric', month:'long', year:'numeric'}) : '—';
  document.getElementById('res-gestion-hora').textContent      = r.Hora || '—';
  document.getElementById('res-gestion-personas').textContent  = '—';
  document.getElementById('res-gestion-notas').textContent     = 'Información no disponible en el sistema.';
  document.getElementById('res-gestion-comentario').value      = '';
  
  document.getElementById('btn-aprobar-reserva').onclick = () => actualizarEstadoReserva(id, 'aprobada');
  document.getElementById('btn-rechazar-reserva').onclick = () => actualizarEstadoReserva(id, 'rechazada');
  
  showPanel('aprobar-reservas', null, 'reservas');
}

async function actualizarEstadoReserva(id, nuevoEstado) {
  try {
    const res = await fetch(`${API}/api/reservas/${id}/estado`, {
      method: 'PUT', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ estado: nuevoEstado })
    });
    if (res.ok) {
      showToast('success', 'Reserva ' + nuevoEstado, 'El residente será notificado.');
      loadReservas();
      setTimeout(() => showPanel('lista-reservas', null, 'reservas'), 1000);
    }
  } catch(e) {
     showToast('error', 'Error', 'No se pudo actualizar la reserva.'); }
}

// ── INIT ──────────────────────────────────────────────────────
(function init() {
  const user = JSON.parse(sessionStorage.getItem('condoUser') || 'null');
  if (!user || user.rol !== 'admin') {
    alert('Acceso restringido. Por favor inicia sesión como administrador.');
    window.location.href = 'Login.html';
    return;
  }
  
  loadNotificaciones();
  loadDashboard();
  if (user) {
    const initials = ((user.nombre||'A')[0] + (user.apellido||'P')[0]).toUpperCase();
    const ta = document.getElementById('topbar-avatar');
    const tn = document.getElementById('topbar-name');
    if (ta) ta.textContent = initials;
    if (tn) tn.textContent = (user.nombre||'Admin') + ' ' + (user.apellido||'');
  }
})();
