const API = 'http://localhost:5000';
let currentUser = JSON.parse(sessionStorage.getItem('condoUser') || 'null');
let residentData = null;

async function init() {
  console.log("Iniciando panel de residente...", currentUser);
  if (!currentUser) {
    console.warn("No hay usuario en session, redirigiendo...");
    window.location.href = 'trabajo final margarita-jose luis/Login.html';
    return;
  }
  
  // Limpiar placeholders estáticos para notar si la carga falla
  document.querySelectorAll('[id^="user-name"], [id^="welcome-"], [id^="profile-"]').forEach(el => el.textContent = "...");

  try {
    await loadResidentBaseData();
    loadResidentDashboard();
    loadResidentProfile();
    loadAnuncios();
  } catch (err) {
    console.error("Error en la inicialización:", err);
  }
}

async function loadResidentBaseData() {
  console.log("Cargando datos para usuario ID:", currentUser.id);
  try {
    const res = await fetch(`${API}/api/residente/data/${currentUser.id}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    residentData = await res.json();
    console.log("Datos recibidos:", residentData);
    
    const fullName = `${residentData.Nombre || ''} ${residentData.Apellido || ''}`.trim() || currentUser.nombre || 'Residente';
    const aptoStr = residentData.Apartamento ? `Apto ${residentData.Apartamento}` : 'Sin apartamento';
    
    // Top bar & Sidebar
    if (document.getElementById('user-name-side')) document.getElementById('user-name-side').textContent = fullName;
    if (document.getElementById('user-name-top'))  document.getElementById('user-name-top').textContent  = fullName;
    if (document.getElementById('user-apto-side')) document.getElementById('user-apto-side').textContent = aptoStr;
    if (document.getElementById('user-apto-top'))  document.getElementById('user-apto-top').textContent  = `Residente · ${aptoStr}`;
    
    // Dashboard Welcome
    if (document.getElementById('welcome-name'))    document.getElementById('welcome-name').textContent = `Bienvenido, ${residentData.Nombre || currentUser.nombre} 👋`;
    if (document.getElementById('welcome-details')) document.getElementById('welcome-details').textContent = `${aptoStr} · Piso ${residentData.Piso || '—'} · Residencial Las Palmas`;
    
    // Profile Panel
    if (document.getElementById('profile-name')) document.getElementById('profile-name').textContent = fullName;
    if (document.getElementById('profile-apto')) document.getElementById('profile-apto').textContent = `Residente · ${aptoStr}`;
    
    // Calculate initials correctly
    const firstInitial = (residentData.Nombre || currentUser.nombre || '?')[0];
    let lastInitial = '';
    if (residentData.Apellido && residentData.Apellido.trim()) {
        lastInitial = residentData.Apellido.trim()[0];
    } else if (currentUser.nombre && currentUser.nombre.includes(' ')) {
        const parts = currentUser.nombre.split(' ');
        lastInitial = parts[parts.length - 1][0];
    }
    const initials = (firstInitial + lastInitial).toUpperCase();
    console.log("Iniciales calculadas:", initials);
    document.querySelectorAll('.avatar').forEach(av => av.textContent = initials);
  } catch (e) {
    console.error('Error loading base data:', e);
    // Fallback con datos de sesión si la API de residente falla
    const fullName = currentUser.nombre || 'Residente';
    document.querySelectorAll('[id^="user-name"], [id^="profile-name"]').forEach(el => el.textContent = fullName);
    if (document.getElementById('welcome-name')) document.getElementById('welcome-name').textContent = `Bienvenido, ${fullName} 👋`;
    
    // Initials fallback
    const initials = (currentUser.nombre || 'R').split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
    document.querySelectorAll('.avatar').forEach(av => av.textContent = initials);
    
    loadResidentProfile(); // Call even on failure
  }
}

async function loadResidentDashboard() {
  if (!residentData) return;
  const stats = residentData.stats || {};
  
  // KPI Cards using new IDs
  const kpiPagoStatus = document.getElementById('kpi-pago-status');
  const kpiPagoDesc = document.getElementById('kpi-pago-desc');
  const kpiMontoPendiente = document.getElementById('kpi-monto-pendiente');
  const kpiVenceDesc = document.getElementById('kpi-vence-desc');
  const kpiReservasCount = document.getElementById('kpi-reservas-count');
  const kpiReservasDesc = document.getElementById('kpi-reservas-desc');
  const kpiIncidenciasCount = document.getElementById('kpi-incidencias-count');
  const kpiIncidenciasDesc = document.getElementById('kpi-incidencias-desc');

  if (kpiPagoStatus) {
    if (stats.pagosPendientes > 0) {
        kpiPagoStatus.textContent = 'Pendiente';
        kpiPagoStatus.style.color = '#c0392b';
        if (kpiPagoDesc) kpiPagoDesc.textContent = `● ${stats.pagosPendientes} pago(s) pendiente(s)`;
    } else {
        kpiPagoStatus.textContent = 'Al día';
        kpiPagoStatus.style.color = '#0f2d52';
        if (kpiPagoDesc) kpiPagoDesc.textContent = '✓ No tienes deudas';
    }
  }
  
  if (kpiMontoPendiente) kpiMontoPendiente.textContent = `RD$${(residentData.Cuota || 4500).toLocaleString()}`;
  if (kpiVenceDesc) kpiVenceDesc.textContent = stats.pagosPendientes > 0 ? '⏰ Pago vencido' : '⏰ Próximo vencimiento: 5 mayo';
  if (kpiReservasCount) kpiReservasCount.textContent = stats.reservasActivas || 0;
  if (kpiReservasDesc) kpiReservasDesc.textContent = stats.reservasActivas > 0 ? '📅 Tienes reservas activas' : 'Sin reservas próximas';
  if (kpiIncidenciasCount) kpiIncidenciasCount.textContent = stats.incidenciasActivas || 0;
  if (kpiIncidenciasDesc) kpiIncidenciasDesc.textContent = stats.incidenciasActivas > 0 ? '● En proceso' : '✓ Sin reportes activos';
  
  // Resumen financiero
  if (document.getElementById('resumen-total-pagado')) {
    document.getElementById('resumen-total-pagado').textContent = `RD$${(stats.totalPagadoAnio || 0).toLocaleString()}`;
  }
  if (document.getElementById('resumen-monto-pendiente')) {
    document.getElementById('resumen-monto-pendiente').textContent = `RD$${(stats.montoPendienteTotal || 0).toLocaleString()}`;
  }

  const label = document.getElementById('meses-pagados-label');
  if (label) {
      const meses = Math.floor((stats.totalPagadoAnio || 0) / (residentData.Cuota || 4500));
      label.textContent = `${meses} de 12 meses pagados`;
      const progress = document.getElementById('meses-progress-bar');
      if (progress) progress.style.width = `${Math.min((meses/12)*100, 100)}%`;
  }

  loadRecentActivity();
}

async function loadRecentActivity() {
    const loader = document.getElementById('activity-loader');
    const card = document.getElementById('recent-activity-card');
    if (!card) return;
    
    try {
        const res = await fetch(`${API}/api/residente/actividad/${currentUser.id}`);
        const data = await res.json();
        
        if (loader) loader.style.display = 'none';
        
        // Remove old activity items
        card.querySelectorAll('.timeline-item').forEach(i => i.remove());
        const noActMsg = card.querySelector('.no-activity-msg');
        if (noActMsg) noActMsg.remove();
        
        if (!data.pagos.length && !data.incidencias.length) {
            const div = document.createElement('div');
            div.className = 'no-activity-msg';
            div.style = 'text-align:center;padding:20px;color:#8a9ab5;font-size:13px;';
            div.textContent = 'No hay actividad reciente para mostrar.';
            card.appendChild(div);
            return;
        }

        let html = '';
        data.pagos.forEach(p => {
            html += `
            <div class="timeline-item">
                <div class="timeline-dot" style="background:#e6f1fb;">💳</div>
                <div>
                  <div style="font-size:13.5px;font-weight:600;color:#1a2a3a;">Pago registrado · ${p.Titulo}</div>
                  <div style="font-size:12px;color:#8a9ab5;">RD$${p.Monto.toLocaleString()} · ${p.Fecha ? new Date(p.Fecha).toLocaleDateString() : 'Reciente'} · <span class="badge ${p.Estado === 'pagado' ? 'badge-green' : 'badge-yellow'}" style="font-size:10.5px;">${p.Estado}</span></div>
                </div>
            </div>`;
        });

        data.incidencias.forEach(i => {
            html += `
            <div class="timeline-item">
                <div class="timeline-dot" style="background:#fff0f0;">⚠️</div>
                <div>
                  <div style="font-size:13.5px;font-weight:600;color:#1a2a3a;">Incidencia: ${i.Titulo}</div>
                  <div style="font-size:12px;color:#8a9ab5;">${new Date(i.Fecha).toLocaleDateString()} · <span class="badge ${i.Estado === 'resuelta' ? 'badge-green' : 'badge-yellow'}" style="font-size:10.5px;">${i.Estado}</span></div>
                </div>
            </div>`;
        });

        const div = document.createElement('div');
        div.innerHTML = html;
        card.appendChild(div);
    } catch (e) {
        console.error("Error al cargar actividad:", e);
    }
}

async function loadResidentProfile() {
    const data = residentData || { 
        Nombre: currentUser.nombre?.split(' ')[0] || '', 
        Apellido: currentUser.nombre?.split(' ').slice(1).join(' ') || '',
        Email: currentUser.email
    };
    console.log("Cargando perfil con:", data);
    const map = {
        'input-nombre':   data.Nombre,
        'input-apellido': data.Apellido,
        'input-cedula':   data.Cedula || '',
        'input-telefono': data.Telefono || '',
        'input-email':    data.Email
    };
    for (const [id, val] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    }
}

async function loadResidentPagos() {
    const tbody = document.querySelector('#panel-historial-pagos tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">Cargando...</td></tr>';
    
    try {
        const res = await fetch(`${API}/api/residente/pagos/${currentUser.id}`);
        const data = await res.json();
        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">No hay pagos registrados.</td></tr>';
            return;
        }
        tbody.innerHTML = data.map(p => `
            <tr>
                <td style="color:#8a9ab5;">#${String(p.IdPago).padStart(4, '0')}</td>
                <td>${p.Concepto}</td>
                <td style="font-weight:600;">RD$${p.Monto.toLocaleString()}</td>
                <td>${p.MetodoPago || '—'}</td>
                <td style="color:#8a9ab5;">${p.Referencia || '—'}</td>
                <td>${p.FechaPago ? new Date(p.FechaPago).toLocaleDateString() : '—'}</td>
                <td><span class="badge ${p.Estado === 'pagado' ? 'badge-green' : 'badge-yellow'}">${p.Estado}</span></td>
            </tr>
        `).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#c0392b;padding:20px;">Error al cargar pagos.</td></tr>';
    }
}

async function loadResidentIncidencias() {
    const container = document.querySelector('#panel-mis-incidencias div:last-child');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:20px;">Cargando incidencias...</div>';
    
    try {
        const res = await fetch(`${API}/api/residente/incidencias/${currentUser.id}`);
        const data = await res.json();
        if (!data.length) {
            container.innerHTML = '<div style="background:#fff;border-radius:12px;padding:32px;text-align:center;color:#8a9ab5;">No has reportado incidencias.</div>';
            return;
        }
        
        const badgeClass = { 'abierta':'badge-red', 'en_proceso':'badge-yellow', 'resuelta':'badge-green' };
        const iconBg = { 'abierta':'#fff0f0', 'en_proceso':'#fff8e6', 'resuelta':'#e6f7ee' };
        
        container.innerHTML = data.map(inc => `
            <div style="background:#fff;border-radius:12px;border:0.5px solid #dde5ef;padding:20px;margin-bottom:12px;">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <div style="width:44px;height:44px;background:${iconBg[inc.Estado]||'#f0f4f9'};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${inc.Estado==='resuelta'?'💡':'🔧'}</div>
                  <div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;"><span style="font-size:14px;font-weight:700;color:#0f2d52;">${inc.Titulo}</span><span class="badge ${badgeClass[inc.Estado]||'badge-gray'}">${inc.Estado.replace('_',' ')}</span></div>
                    <div style="font-size:12.5px;color:#8a9ab5;">Reportado el ${new Date(inc.FechaReporte).toLocaleDateString()} · Categoría: ${inc.Categoria}</div>
                  </div>
                </div>
              </div>
              <div style="font-size:13px;color:#4a5a72;padding:12px;background:#f8fafc;border-radius:8px;">${inc.Descripcion}</div>
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<div style="text-align:center;color:#c0392b;padding:20px;">Error al cargar incidencias.</div>';
    }
}

async function loadAnuncios() {
  const container = document.querySelector('#panel-anuncios > div:last-child');
  if (!container) return;
  try {
    const res  = await fetch(API + '/api/notificaciones/' + currentUser.id);
    const data = await res.json();
    if (!data.length) {
      container.innerHTML = '<div style="background:#fff;border-radius:12px;padding:32px;text-align:center;color:#8a9ab5;">No hay anuncios creados aún.</div>';
      return;
    }
    const tipoColor = { anuncio:'#0d7d45', incidencia:'#e24b4a', reserva:'#3b9eff', pago:'#534ab7', otro:'#b07800' };
    const tipoBadge = { anuncio:'badge-green', incidencia:'badge-red', reserva:'badge-blue', pago:'badge-navy', otro:'badge-yellow' };
    
    container.innerHTML = data.map(n => `
      <div style="background:#fff;border-radius:12px;border:0.5px solid #dde5ef;padding:22px;border-left:4px solid ${tipoColor[n.Tipo]||'#3b9eff'};margin-bottom:12px;">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="badge ${tipoBadge[n.Tipo]||'badge-gray'}">${n.Tipo.toUpperCase()}</span>
          </div>
          <div style="font-size:12px;color:#8a9ab5;">${new Date(n.FechaCreacion).toLocaleString()}</div>
        </div>
        <div style="font-size:15px;font-weight:700;color:#0f2d52;margin-bottom:8px;">${n.Titulo}</div>
        <div style="font-size:13.5px;color:#4a5a72;line-height:1.6;">${n.Mensaje}</div>
      </div>`).join('');
  } catch(e) { console.error('Error loading anuncios:', e); }
}

// Form Submissions
async function submitIncidencia() {
    const data = {
        usuario_id: currentUser.id,
        categoria: document.getElementById('inc-cat').value,
        titulo: document.getElementById('inc-titulo').value,
        descripcion: document.getElementById('inc-desc').value,
        ubicacion: document.getElementById('inc-ubi').value,
        prioridad: document.querySelector('input[name="prio"]:checked').value
    };
    
    if (!data.titulo || !data.descripcion) {
        showToast('error', 'Campos incompletos', 'Por favor llena el título y la descripción.');
        return;
    }
    
    try {
        const res = await fetch(`${API}/api/residente/incidencia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const resData = await res.json();
        if (res.ok) {
            showToast('success', 'Incidencia reportada', 'El administrador fue notificado.');
            showPanel('mis-incidencias', null, 'incidencias');
            loadResidentIncidencias();
        } else {
            showToast('error', 'Error', resData.message);
        }
    } catch (e) {
        showToast('error', 'Error de conexión', 'No se pudo enviar el reporte.');
    }
}

let selectedArea = '';
function selectArea(area, el) {
    selectedArea = area;
    document.querySelectorAll('[id^="area-"]').forEach(d => {
        d.classList.remove('sel');
        d.style.borderColor = '#dde5ef';
        d.style.background = '#fff';
    });
    el.classList.add('sel');
    el.style.borderColor = '#3b9eff';
    el.style.background = '#f0f7ff';
}

async function submitReserva() {
    const data = {
        usuario_id: currentUser.id,
        area: selectedArea,
        fecha: document.getElementById('res-fecha').value,
        hora: document.getElementById('res-hora').value
    };
    
    if (!data.area || !data.fecha) {
        showToast('error', 'Campos incompletos', 'Selecciona un área y una fecha.');
        return;
    }
    
    try {
        const res = await fetch(`${API}/api/residente/reserva`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const resData = await res.json();
        if (res.ok) {
            showToast('success', 'Solicitud enviada', 'Tu reserva está pendiente de aprobación.');
            showPanel('mis-reservas', null, 'reservas');
        } else {
            showToast('error', 'Error', resData.message);
        }
    } catch (e) {
        showToast('error', 'Error de conexión', 'No se pudo enviar la solicitud.');
    }
}

// Redirect logout to Login.html
function confirmLogout() { 
    confirmAction('¿Cerrar sesión?', 'Tu sesión será cerrada y serás redirigido al inicio.', () => {
        sessionStorage.removeItem('condoUser');
        showToast('success', 'Sesión cerrada', 'Hasta pronto.');
        setTimeout(() => window.location.href = 'trabajo final margarita-jose luis/Login.html', 1000);
    }); 
}

// Intercept showPanel to load data
const originalShowPanel = window.showPanel;
window.showPanel = function(id, navBtn, menuId) {
    originalShowPanel(id, navBtn, menuId);
    if (id === 'dashboard') loadResidentDashboard();
    if (id === 'mi-perfil') loadResidentProfile();
    if (id === 'historial-pagos' || id === 'estado-cuenta') loadResidentPagos();
    if (id === 'mis-incidencias') loadResidentIncidencias();
    if (id === 'anuncios') loadAnuncios();
};

init();

