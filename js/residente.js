// API defined in config.js (loaded before this script)
let currentUser = JSON.parse(sessionStorage.getItem('condoUser') || 'null');
let residentData = null;
let selectedDate = '';
let editingReservaId = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let currentAreaReservas = []; // Para sombrear fechas ocupadas en el área seleccionada
async function init() {
  console.log("Iniciando panel de residente...", currentUser);
  if (!currentUser) {
    console.warn("No hay usuario en session, redirigiendo...");
    window.location.href = 'login.html';
    return;
  }
  
  document.querySelectorAll('[id^="user-name"], [id^="welcome-"], #profile-name, #profile-apto').forEach(el => el.textContent = "...");

  try {
    await loadResidentBaseData();
    loadResidentDashboard();
    loadResidentProfile();
    loadAnuncios();
    loadNotificaciones();
    renderCalendar();
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
    const apto = residentData.Apartamento;
    const aptoStr = apto ? `Apto ${apto}` : 'Sin apartamento';
    const aptoFull = apto ? `Apartamento ${apto}` : 'Sin apartamento';
    
    // Top bar & Sidebar
    if (document.getElementById('user-name-side')) document.getElementById('user-name-side').textContent = fullName;
    if (document.getElementById('user-name-top'))  document.getElementById('user-name-top').textContent  = fullName;
    if (document.getElementById('user-apto-side')) document.getElementById('user-apto-side').textContent = aptoFull;
    if (document.getElementById('user-apto-top'))  document.getElementById('user-apto-top').textContent  = `Residente · ${aptoStr}`;
    
    // Dashboard Welcome
    if (document.getElementById('welcome-name'))    document.getElementById('welcome-name').textContent = `Bienvenido, ${residentData.Nombre || currentUser.nombre} `;
    if (document.getElementById('welcome-details')) document.getElementById('welcome-details').textContent = apto ? `${aptoStr} · Piso ${residentData.Piso || '—'} · Residencial Las Palmas` : 'Sin apartamento asignado · Contacta al administrador';
    
    // Profile Panel
    if (document.getElementById('profile-name')) document.getElementById('profile-name').textContent = fullName;
    if (document.getElementById('profile-apto')) document.getElementById('profile-apto').textContent = apto ? `Residente · ${aptoFull}` : 'Residente · Sin apartamento';

    // Dynamic subtitles on section headers
    const now = new Date().toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
    const sub = apto ? `${aptoFull} · ${now}` : 'Apartamento no asignado';
    if (document.getElementById('estado-cuenta-sub'))   document.getElementById('estado-cuenta-sub').textContent   = sub;
    if (document.getElementById('historial-pagos-sub')) document.getElementById('historial-pagos-sub').textContent = apto ? aptoFull : 'Sin apartamento';
    if (document.getElementById('mis-reservas-sub'))    document.getElementById('mis-reservas-sub').textContent    = apto ? `Historial de reservas · ${aptoStr}` : 'Sin apartamento asignado';

    // Block restricted sections if no apartment
    applyApartmentGuard(apto);
    
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
    if (document.getElementById('welcome-name')) document.getElementById('welcome-name').textContent = `Bienvenido, ${fullName} `;
    
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
        if (kpiPagoDesc) kpiPagoDesc.textContent = ' No tienes deudas';
    }
  }
  
  if (kpiMontoPendiente) kpiMontoPendiente.textContent = `RD$${(residentData.Cuota || 4500).toLocaleString()}`;
  
  // Fechas dinámicas
  const today = new Date();
  const mesActual = today.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
  const nextFive = new Date(today.getFullYear(), today.getMonth() + (today.getDate() > 5 ? 1 : 0), 5);
  const fechaVence = `Vence ${nextFive.toLocaleDateString('es-DO', { day:'numeric', month:'long' })}`;
  
  if (kpiVenceDesc) kpiVenceDesc.textContent = stats.pagosPendientes > 0 ? '⏰ Pago vencido' : `⏰ Próximo: ${fechaVence}`;
  if (kpiReservasCount) kpiReservasCount.textContent = stats.reservasActivas || 0;
  if (kpiReservasDesc) kpiReservasDesc.textContent = stats.reservasActivas > 0 ? ' Tienes reservas activas' : 'Sin reservas próximas';
  if (kpiIncidenciasCount) kpiIncidenciasCount.textContent = stats.incidenciasActivas || 0;
  if (kpiIncidenciasDesc) kpiIncidenciasDesc.textContent = stats.incidenciasActivas > 0 ? '● En proceso' : ' Sin reportes activos';
  
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
                <div class="timeline-dot" style="background:#e6f1fb;"></div>
                <div>
                  <div style="font-size:13.5px;font-weight:600;color:#1a2a3a;">Pago registrado · ${p.Titulo}</div>
                  <div style="font-size:12px;color:#8a9ab5;">RD$${p.Monto.toLocaleString()} · ${p.Fecha ? new Date(p.Fecha).toLocaleDateString() : 'Reciente'} · <span class="badge ${p.Estado === 'pagado' ? 'badge-green' : 'badge-yellow'}" style="font-size:10.5px;">${p.Estado}</span></div>
                </div>
            </div>`;
        });

        data.incidencias.forEach(i => {
            html += `
            <div class="timeline-item">
                <div class="timeline-dot" style="background:#fff0f0;"></div>
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
    try {
        const res = await fetch(`${API}/api/residente/perfil/${currentUser.id}`);
        const data = await res.json();
        if (!res.ok) return;

        const map = {
            'input-nombre':   data.nombre,
            'input-apellido': data.apellido,
            'input-telefono': data.telefono || '',
            'input-email':    data.email
        };
        for (const [id, val] of Object.entries(map)) {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        }
    } catch (e) { console.error("Error al cargar perfil:", e); }
}

async function updateResidentProfile() {
    const data = {
        nombre:   document.getElementById('input-nombre').value,
        apellido: document.getElementById('input-apellido').value,
        telefono: document.getElementById('input-telefono').value,
        email:    document.getElementById('input-email').value
    };
    try {
        const res = await fetch(`${API}/api/residente/perfil/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            showToast('success', 'Perfil actualizado', 'Tus datos fueron guardados correctamente.');
            // Actualizar sesión local
            currentUser.nombre = `${data.nombre} ${data.apellido}`;
            currentUser.email = data.email;
            sessionStorage.setItem('condoUser', JSON.stringify(currentUser));
            loadResidentBaseData(); // Refresh UI names
        } else {
            showToast('error', 'Error', 'No se pudo actualizar el perfil.');
        }
    } catch (e) { showToast('error', 'Error', 'Sin conexión con el servidor.'); }
}

async function loadResidentPagos() {
    const tbody = document.getElementById('historial-pagos-tbody') ||
                  document.querySelector('#panel-historial-pagos tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">Cargando...</td></tr>';
    
    try {
        const res = await fetch(`${API}/api/residente/pagos/${currentUser.id}`);
        const data = await res.json();
        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#8a9ab5;">No hay pagos registrados.</td></tr>';
        } else {
            tbody.innerHTML = data.map(p => `
                <tr>
                    <td style="color:#8a9ab5;">#${String(p.IdPago).padStart(4, '0')}</td>
                    <td>${p.Concepto || 'Mantenimiento Mensual'}</td>
                    <td style="font-weight:600;">RD$${(p.Monto || 0).toLocaleString()}</td>
                    <td>${p.MetodoPago || '—'}</td>
                    <td style="color:#8a9ab5;">${p.Referencia || '—'}</td>
                    <td>${p.FechaPago ? new Date(p.FechaPago).toLocaleDateString('es-DO') : '—'}</td>
                    <td><span class="badge ${p.Estado === 'pagado' ? 'badge-green' : 'badge-yellow'}">${p.Estado}</span></td>
                </tr>
            `).join('');
        }
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#c0392b;padding:20px;">Error al cargar pagos.</td></tr>';
    }
    
    // Actualizar estado de cuenta después de cargar pagos
    await loadEstadoCuenta();
}

async function loadEstadoCuenta() {
    if (!residentData) return;
    const stats = residentData.stats || {};
    const cuota = residentData.Cuota || 4500;
    const apto = residentData.Apartamento;
    
    // Fecha dinámica
    const today = new Date();
    const mesNombre = today.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
    const nextFive = new Date(today.getFullYear(), today.getMonth() + (today.getDate() > 5 ? 1 : 0), 5);
    const venceLabel = `Vence ${nextFive.toLocaleDateString('es-DO', { day:'numeric', month:'long', year:'numeric' })}`;
    const periodoLabel = today.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
    const periodoCapitalized = periodoLabel.charAt(0).toUpperCase() + periodoLabel.slice(1);
    
    const totalPagado = stats.totalPagadoAnio || 0;
    const montoPendiente = stats.montoPendienteTotal || cuota;
    const cuotasPagadas = cuota > 0 ? Math.floor(totalPagado / cuota) : 0;
    const alDia = stats.pagosPendientes === 0;
    const aptoLabel = apto ? `Apartamento ${apto}` : 'Sin apartamento';
    
    // Estado de cuenta - tarjetas superiores
    const ecSaldo   = document.getElementById('ec-saldo-monto');
    const ecVence   = document.getElementById('ec-saldo-vence');
    const ecPagado  = document.getElementById('ec-pagado-monto');
    const ecCuotas  = document.getElementById('ec-cuotas-info');
    const ecCuotaM  = document.getElementById('ec-cuota-mensual');
    const ecDesglose = document.getElementById('ec-desglose-title');
    const ecPayMonto = document.getElementById('ec-pay-monto');
    const ecPayInfo  = document.getElementById('ec-pay-info');
    
    if (ecSaldo)   ecSaldo.textContent   = `RD$${montoPendiente.toLocaleString()}`;
    if (ecVence)   ecVence.textContent   = alDia ? 'Al día ✔' : venceLabel;
    if (ecPagado)  ecPagado.textContent  = `RD$${totalPagado.toLocaleString()}`;
    if (ecCuotas)  ecCuotas.textContent  = cuotasPagadas > 0 ? `${cuotasPagadas} cuota${cuotasPagadas!==1?'s':''} · ${alDia?'Al día':'Pendiente'}` : 'Sin pagos registrados';
    if (ecCuotaM)  ecCuotaM.textContent  = `RD$${cuota.toLocaleString()}`;
    if (ecDesglose) ecDesglose.textContent = `Desglose de cargos · ${periodoCapitalized}`;
    if (ecPayMonto) ecPayMonto.textContent = `RD$${cuota.toLocaleString()}`;
    if (ecPayInfo)  ecPayInfo.textContent  = `${periodoCapitalized} · ${venceLabel}`;
    
    // Realizar pago panel
    const rpMonto   = document.getElementById('rp-monto');
    const rpPeriodo = document.getElementById('rp-periodo');
    const rpVence   = document.getElementById('rp-vence');
    const rpConcepto = document.getElementById('rp-concepto');
    if (rpMonto)   rpMonto.textContent   = `RD$${cuota.toLocaleString()}`;
    if (rpPeriodo) rpPeriodo.textContent = periodoCapitalized;
    if (rpVence)   rpVence.textContent   = venceLabel;
    if (rpConcepto) rpConcepto.value     = `Mantenimiento mensual · ${periodoCapitalized}`;
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
                  <div style="width:44px;height:44px;background:${iconBg[inc.Estado]||'#f0f4f9'};border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">${inc.Estado==='resuelta'?'':''}</div>
                  <div>
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;"><span style="font-size:14px;font-weight:700;color:#0f2d52;">${inc.Titulo}</span><span class="badge ${badgeClass[inc.Estado]||'badge-gray'}">${inc.Estado.replace('_',' ')}</span></div>
                    <div style="font-size:12.5px;color:#8a9ab5;">Reportado el ${new Date(inc.FechaReporte).toLocaleDateString()} · Categoría: ${inc.Categoria}</div>
                  </div>
                </div>
              </div>
              <div style="font-size:13px;color:#4a5a72;padding:12px;background:#f8fafc;border-radius:8px;">${inc.Descripcion}</div>
              ${inc.TecnicoId ? `
              <div style="margin-top:12px;padding-top:12px;border-top:0.5px solid #dde5ef;display:flex;align-items:center;justify-content:space-between;font-size:12.5px;color:#4a5a72;">
                <span>🛠️ Técnico Asignado: <strong>${inc.TecnicoNombre}</strong></span>
                <span style="background:#eef2f6;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:#0f2d52;">Esp: ${inc.TecnicoEspecialidad.charAt(0).toUpperCase() + inc.TecnicoEspecialidad.slice(1)}</span>
              </div>
              ` : `
              <div style="margin-top:12px;padding-top:12px;border-top:0.5px solid #dde5ef;font-size:11.5px;color:#8a9ab5;">
                ⏳ Esperando asignación de técnico
              </div>
              `}
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
    
    // Cargar fechas ocupadas para esta área específica
    loadOccupiedDates(area);
}

async function loadOccupiedDates(area) {
    try {
        const res = await fetch(`${API}/api/area/${area}/fechas-ocupadas`);
        currentAreaReservas = await res.json();
        renderCalendar(); // Refrescar para sombrear
    } catch (e) { console.error("Error al cargar fechas ocupadas:", e); }
}

async function submitPago() {
    const data = {
        usuario_id: currentUser.id,
        monto: 4500, // Monto estático por ahora o dinámico si tienes cuotas
        metodo: document.getElementById('pay-method').value,
        referencia: document.getElementById('pay-ref').value,
        fecha: document.getElementById('pay-date').value
    };
    
    if (!data.metodo || !data.referencia) {
        showToast('error', 'Campos incompletos', 'Ingresa el método y la referencia del pago.');
        return;
    }
    
    try {
        const res = await fetch(`${API}/api/residente/pago`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            showToast('success', 'Pago enviado', 'Tu pago ha sido registrado y está en verificación.');
            // Refrescar datos para actualizar totales
            await loadResidentBaseData();
            showPanel('historial-pagos', null, 'pagos');
        } else {
            showToast('error', 'Error', 'No se pudo registrar el pago.');
        }
    } catch (e) { showToast('error', 'Error', 'Sin conexión con el servidor.'); }
}

async function submitReserva() {
    const data = {
        usuario_id: currentUser.id,
        area: selectedArea,
        fecha: selectedDate,
        hora_inicio: document.getElementById('res-hora').value,
        hora_fin: document.getElementById('res-hora-fin').value,
        personas: parseInt(document.getElementById('res-personas').value) || 1,
        descripcion: document.getElementById('res-desc').value
    };
    
    if (!data.area || !data.fecha || !data.hora_inicio || !data.hora_fin) {
        showToast('error', 'Campos incompletos', 'Selecciona área, fecha y horario (inicio y fin).');
        return;
    }
    
    try {
        const url = editingReservaId ? `${API}/api/residente/reservas/${editingReservaId}` : `${API}/api/residente/reserva`;
        const method = editingReservaId ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const resData = await res.json();
        
        if (res.ok) {
            showToast('success', editingReservaId ? 'Reserva actualizada' : 'Solicitud enviada', 'Tu reserva ha sido procesada.');
            editingReservaId = null;
            document.querySelector('#panel-nueva-reserva button').textContent = 'Solicitar reserva';
            showPanel('mis-reservas', null, 'reservas');
        } else {
            // Manejo específico para el error 409 (Conflicto de disponibilidad)
            const title = res.status === 409 ? 'No disponible' : 'Error';
            showToast('error', title, resData.message || 'No se pudo procesar la reserva.');
        }
    } catch (e) {
        showToast('error', 'Error de conexión', 'No se pudo conectar con el servidor.');
    }
}

async function loadResidentReservas() {
    const container = document.getElementById('reservas-residentes-list');
    if (!container) return;
    container.innerHTML = '<div style="background:#fff;border-radius:12px;padding:32px;text-align:center;color:#8a9ab5;">Cargando tus reservas...</div>';
    
    try {
        const res = await fetch(`${API}/api/residente/reservas/${currentUser.id}`);
        const data = await res.json();
        if (!data.length) {
            container.innerHTML = '<div style="background:#fff;border-radius:12px;padding:32px;text-align:center;color:#8a9ab5;">No tienes reservas registradas.</div>';
            return;
        }
        
        const badgeClass = { pendiente:'badge-yellow', aprobada:'badge-green', rechazada:'badge-red' };
        
        container.innerHTML = data.map(r => `
            <div style="background:#fff;border-radius:12px;border:0.5px solid #dde5ef;padding:20px;margin-bottom:12px;">
              <div style="display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:14px;">
                  <div style="width:48px;height:48px;background:#f0f4f9;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;">📋</div>
                  <div>
                    <div style="font-size:14px;font-weight:700;color:#0f2d52;margin-bottom:3px;">${r.area}</div>
                    <div style="font-size:12.5px;color:#8a9ab5;"> 
                        ${new Date(r.fecha).toLocaleDateString('es-DO', {day:'numeric', month:'long', year:'numeric'})} · 
                        ${r.hora_inicio.substring(0,5)} – ${r.hora_fin.substring(0,5)}
                    </div>
                  </div>
                </div>
                <div style="text-align:right; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                  <span class="badge ${badgeClass[r.estado]||'badge-gray'}">${r.estado}</span>
                  <div style="display:flex; gap:6px;">
                    ${r.estado === 'pendiente' ? `<button class="btn-secondary btn-sm" onclick='editReserva(${JSON.stringify(r)})'>Editar</button>` : ''}
                    ${r.estado === 'pendiente' ? `<button class="btn-danger btn-sm" onclick="cancelReserva(${r.id})">Cancelar</button>` : ''}
                  </div>
                </div>
              </div>
              ${r.descripcion ? `<div style="margin-top:12px; font-size:12px; color:#4a5a72; background:#f8fafc; padding:8px; border-radius:6px;"><b>Nota:</b> ${r.descripcion} (${r.personas} personas)</div>` : ''}
            </div>
        `).join('');
    } catch (e) {
        container.innerHTML = '<div style="background:#fff;border-radius:12px;padding:32px;text-align:center;color:#c0392b;">Error al cargar reservas.</div>';
    }
}

async function cancelReserva(id) {
    confirmAction('¿Cancelar reserva?', 'Esta acción eliminará tu solicitud de reserva.', async () => {
        try {
            const res = await fetch(`${API}/api/residente/reservas/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('success', 'Reserva cancelada', 'Tu solicitud ha sido eliminada.');
                loadResidentReservas();
            }
        } catch (e) { showToast('error', 'Error', 'No se pudo cancelar la reserva.'); }
    });
}

function editReserva(r) {
    editingReservaId = r.id;
    selectedArea = Object.keys(areaMapReverse).find(k => areaMapReverse[k] === r.area) || 'salon';
    
    // Select visual area
    document.querySelectorAll('[id^="area-"]').forEach(d => {
        d.classList.remove('sel');
        d.style.borderColor = '#dde5ef';
        d.style.background = '#fff';
    });
    const areaEl = document.getElementById('area-' + selectedArea);
    if (areaEl) {
        areaEl.classList.add('sel');
        areaEl.style.borderColor = '#3b9eff';
        areaEl.style.background = '#f0f7ff';
    }

    selectedDate = r.fecha.split('T')[0];
    const dateParts = selectedDate.split('-');
    currentYear = parseInt(dateParts[0]);
    currentMonth = parseInt(dateParts[1]) - 1;
    renderCalendar();

    document.getElementById('selected-date-display').textContent = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-DO', {day:'numeric', month:'long', year:'numeric'});
    document.getElementById('res-hora').value = r.hora_inicio.substring(0,5);
    document.getElementById('res-hora-fin').value = r.hora_fin.substring(0,5);
    document.getElementById('res-personas').value = r.personas || '';
    document.getElementById('res-desc').value = r.descripcion || '';
    
    document.querySelector('#panel-nueva-reserva button').textContent = 'Guardar cambios';
    showPanel('nueva-reserva', null, 'reservas');
}

const areaMapReverse = { 'salon': 'Salón Social', 'piscina': 'Piscina', 'gym': 'Gimnasio', 'bbq': 'Área BBQ' };

// ── CALENDAR LOGIC ───────────────────────────────────────────
function renderCalendar() {
    const container = document.getElementById('cal-grid-container');
    const title = document.getElementById('cal-month-year');
    if (!container || !title) return;

    const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    title.textContent = `${months[currentMonth]} ${currentYear}`;

    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Start with empty days (adjusting Sunday=0 to Monday=1 or just keeping it)
    let html = '';
    const emptyDays = (firstDay === 0) ? 6 : firstDay - 1; // Start on Monday
    for (let i = 0; i < emptyDays; i++) html += '<div class="cal-day past"></div>';

    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isPast = new Date(currentYear, currentMonth, d) < today.setHours(0,0,0,0);
        const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, d).toDateString();
        const isSelected = selectedDate === dateStr;
        const isOccupied = currentAreaReservas.includes(dateStr);

        let classes = `cal-day ${isPast ? 'past' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected-day' : ''}`;
        if (isOccupied && !isSelected) classes += ' has-event';

        html += `<div class="${classes}" 
                     onclick="${isPast ? '' : `selectCalendarDate('${dateStr}')`}"
                     style="${isSelected ? 'background:#0f2d52;color:#fff;' : (isOccupied ? 'background:#e6f1fb;color:#1a6fc4;font-weight:600;' : '')}">${d}</div>`;
    }
    container.innerHTML = html;
}

window.changeMonth = function(offset) {
    currentMonth += offset;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    else if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
};

window.selectCalendarDate = function(dateStr) {
    selectedDate = dateStr;
    const dateObj = new Date(dateStr + 'T12:00:00'); // Use noon to avoid TZ issues
    document.getElementById('selected-date-display').textContent = dateObj.toLocaleDateString('es-DO', {day:'numeric', month:'long', year:'numeric'});
    renderCalendar();
};


// ── APARTMENT GUARD ──────────────────────────────────────────
const RESTRICTED_PANELS = ['estado-cuenta', 'historial-pagos', 'realizar-pago',
                           'nueva-reserva', 'mis-reservas',
                           'reportar-incidencia', 'mis-incidencias'];

function applyApartmentGuard(apto) {
  const noApto = !apto;
  RESTRICTED_PANELS.forEach(panelId => {
    const panel = document.getElementById('panel-' + panelId);
    if (!panel) return;
    if (noApto) {
      // Insert banner if not already there
      if (!panel.querySelector('.no-apto-banner')) {
        const banner = document.createElement('div');
        banner.className = 'no-apto-banner';
        banner.style.display = 'flex';
        banner.innerHTML = `⚠️ <span style="margin-left:8px;"><strong>Apartamento no asignado.</strong> El administrador debe asignarte un apartamento antes de que puedas usar esta sección.</span>`;
        panel.insertBefore(banner, panel.firstChild);
      } else {
        panel.querySelector('.no-apto-banner').style.display = 'flex';
      }
      // Dim everything after the banner
      [...panel.children].forEach(child => {
        if (!child.classList.contains('no-apto-banner')) {
          child.style.opacity = '0.3';
          child.style.pointerEvents = 'none';
        }
      });
    } else {
      const banner = panel.querySelector('.no-apto-banner');
      if (banner) banner.style.display = 'none';
      [...panel.children].forEach(child => {
        if (!child.classList.contains('no-apto-banner')) {
          child.style.opacity = '';
          child.style.pointerEvents = '';
        }
      });
    }
  });
}

// Intercept showPanel to load data
const originalShowPanel = window.showPanel;
window.showPanel = function(id, navBtn, menuId) {
    originalShowPanel(id, navBtn, menuId);
    if (id === 'dashboard') loadResidentDashboard();
    if (id === 'mi-perfil') loadResidentProfile();
    if (id === 'historial-pagos' || id === 'estado-cuenta' || id === 'realizar-pago') {
        loadResidentPagos();
        loadEstadoCuenta();
    }
    if (id === 'mis-incidencias') loadResidentIncidencias();
    if (id === 'mis-reservas') loadResidentReservas();
    if (id === 'anuncios') loadAnuncios();
};

function loadAnuncios() {
  if (!currentUser) return;
  const container = document.getElementById('anuncios-container');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:24px;color:#8a9ab5;font-size:13px;">Cargando anuncios...</div>';

  fetch(`${API}/api/anuncios`)
    .then(r => r.json())
    .then(data => {
      renderAnunciosPanel(data);
    })
    .catch(() => {
      container.innerHTML = '<div style="text-align:center;padding:24px;color:#c0392b;font-size:13px;">No se pudieron cargar los anuncios.</div>';
    });
}

function renderAnunciosPanel(notifs) {
  const container = document.getElementById('anuncios-container');
  if (!container) return;
  // Actualizar subtitulo con conteo
  const sub = document.getElementById('anuncios-count-sub');
  const unread = notifs.filter(n => !n.Leida).length;
  if (sub) sub.textContent = unread > 0 ? `${unread} nuevo${unread > 1 ? 's' : ''} sin leer` : 'Todo al día';

  if (!notifs.length) {
    container.innerHTML = '<div style="background:#fff;border-radius:12px;padding:32px;text-align:center;color:#8a9ab5;border:0.5px solid #dde5ef;">No hay anuncios en este momento.</div>';
    return;
  }

  const tipoConfig = {
    anuncio:        { border: '#0d7d45', badge: 'badge-green',  icon: '📢' },
    pago:           { border: '#534ab7', badge: 'badge-navy',   icon: '💳' },
    incidencia:     { border: '#e24b4a', badge: 'badge-red',    icon: '🚨' },
    reserva:        { border: '#3b9eff', badge: 'badge-blue',   icon: '📅' },
    general:        { border: '#0d7d45', badge: 'badge-green',  icon: '📢' },
    otro:           { border: '#b07800', badge: 'badge-yellow', icon: '🔧' },
    // fallbacks:
    urgente:        { border: '#e24b4a', badge: 'badge-red',    icon: '🚨' },
    mantenimiento:  { border: '#b07800', badge: 'badge-yellow', icon: '🔧' },
    evento:         { border: '#3b9eff', badge: 'badge-blue',   icon: '📅' },
    cobro:          { border: '#534ab7', badge: 'badge-navy',   icon: '💳' },
  };

  container.innerHTML = notifs.map(n => {
    const cfg = tipoConfig[n.Tipo] || tipoConfig.general;
    const fecha = n.FechaCreacion ? new Date(n.FechaCreacion).toLocaleString('es-DO', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '';
    const isNew = !n.Leida;
    return `<div style="background:#fff;border-radius:12px;border:0.5px solid ${n.Leida?'#dde5ef':'#b2d4ff'};padding:22px;border-left:4px solid ${cfg.border};cursor:pointer;"
      onclick="marcarLeida(${n.IdNotificacion})"
      onmouseover="this.style.boxShadow='0 4px 16px rgba(15,45,82,0.08)'"
      onmouseout="this.style.boxShadow='none'">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="badge ${cfg.badge}">${cfg.icon} ${n.Tipo.charAt(0).toUpperCase()+n.Tipo.slice(1)}</span>
          ${isNew ? '<span style="font-size:11.5px;background:#e6f1fb;color:#1a6fc4;padding:2px 8px;border-radius:99px;font-weight:700;">NUEVO</span>' : ''}
        </div>
        <div style="font-size:12px;color:#8a9ab5;">${fecha}</div>
      </div>
      <div style="font-size:15px;font-weight:700;color:#0f2d52;margin-bottom:8px;">${n.Titulo}</div>
      <div style="font-size:13.5px;color:#4a5a72;line-height:1.6;margin-bottom:12px;">${n.Mensaje||''}</div>
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:11.5px;color:#8a9ab5;">
        <span>📢 Publicación oficial</span>
        <span>Por: <strong>${n.Autor||'Administrador'}</strong> (${n.Cargo||'Gestión'})</span>
      </div>
    </div>`;
  }).join('');
}

// ── PROFILE MODAL ─────────────────────────────────────────────
function openProfileModal() {
  if (residentData || currentUser) {
    const initials = document.querySelector('.avatar').textContent;
    document.getElementById('profile-avatar-modal').textContent = initials;
    
    let fName = '';
    if (residentData) {
      fName = `${residentData.Nombre || ''} ${residentData.Apellido || ''}`.trim();
    }
    if (!fName && currentUser) {
      fName = currentUser.nombre;
    }
    document.getElementById('profile-nombre-modal').textContent = fName || 'Residente';
    
    document.getElementById('profile-email-modal').textContent = residentData?.Email || currentUser?.email || '';
    const aptoStr = residentData?.Apartamento ? `Apto ${residentData.Apartamento}` : 'Sin apartamento';
    document.getElementById('profile-rol-modal').textContent = aptoStr;
    if (residentData?.FechaIngreso) {
      document.getElementById('profile-fecha-modal').textContent =
        new Date(residentData.FechaIngreso).toLocaleDateString('es-DO', { year: 'numeric', month: 'long' });
    }
  }
  document.getElementById('profile-modal-overlay').classList.add('open');
}

function closeProfileModal() {
  document.getElementById('profile-modal-overlay').classList.remove('open');
}

// ── NOTIFICATIONS ─────────────────────────────────────────────
let allNotificaciones = [];

async function loadNotificaciones() {
  try {
    const res = await fetch(`${API}/api/notificaciones/${currentUser.id}`);
    allNotificaciones = await res.json();
    renderNotifDropdown();
  } catch(e) {
    const list = document.getElementById('notif-list');
    if (list) list.innerHTML = '<div style="padding:16px;text-align:center;color:#c0392b;font-size:12.5px;">No se pudo conectar con el servidor.</div>';
  }
}

function renderNotifDropdown() {
  const list  = document.getElementById('notif-list');
  const badge = document.getElementById('notif-badge');
  const badgeAnuncios = document.getElementById('badge-anuncios');
  if (!list || !badge) return;
  const unread = allNotificaciones.filter(n => !n.Leida);
  badge.textContent = unread.length;
  badge.style.display = unread.length > 0 ? 'flex' : 'none';
  if (badgeAnuncios) {
    badgeAnuncios.textContent = unread.length;
    badgeAnuncios.style.display = unread.length > 0 ? 'inline-block' : 'none';
  }
  if (!allNotificaciones.length) {
    list.innerHTML = '<div style="padding:24px;text-align:center;color:#8a9ab5;font-size:13px;">No hay notificaciones.</div>';
    return;
  }
  const tipoColor = {
    general:'#0d7d45',
    anuncio:'#0d7d45',
    pago:'#534ab7',
    incidencia:'#e24b4a',
    reserva:'#3b9eff',
    otro:'#b07800',
    // fallbacks
    urgente:'#e24b4a',
    mantenimiento:'#b07800',
    evento:'#3b9eff',
    cobro:'#534ab7'
  };
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
    // Si estamos en el panel de anuncios, volver a renderizarlo también
    const container = document.getElementById('anuncios-container');
    if (container && container.style.display !== 'none') {
      renderAnunciosPanel(allNotificaciones);
    }
  } catch(e) { console.error(e); }
}

async function marcarTodasLeidas() {
  for (const n of allNotificaciones.filter(n => !n.Leida)) {
    await fetch(`${API}/api/notificaciones/${n.IdNotificacion}/leer`, { method: 'PUT' });
    n.Leida = true;
  }
  renderNotifDropdown();
  const container = document.getElementById('anuncios-container');
  if (container) {
    renderAnunciosPanel(allNotificaciones);
  }
  showToast('success', 'Notificaciones', 'Todas marcadas como leídas.');
}

function toggleNotifDropdown() {
  const dd = document.getElementById('notif-dropdown');
  if (dd) dd.style.display = dd.style.display === 'none' || dd.style.display === '' ? 'block' : 'none';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('profile-modal-overlay')?.addEventListener('click', function(e) {
    if (e.target === this) closeProfileModal();
  });
  document.addEventListener('click', function(e) {
    const wrapper = document.getElementById('notif-wrapper');
    if (wrapper && !wrapper.contains(e.target)) {
      const dd = document.getElementById('notif-dropdown');
      if (dd) dd.style.display = 'none';
    }
  });
});

function showToast(type, title, msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toast-title').textContent = title;
  document.getElementById('toast-msg').textContent   = msg;
  document.getElementById('toast-icon').textContent  = type === 'success' ? '' : '❌';
  t.className = 'toast show ' + (type === 'success' ? 'toast-success' : 'toast-error');
  setTimeout(() => t.classList.remove('show'), 3500);
}

function confirmAction(title, body, onConfirm) {
  document.getElementById('modal-title').textContent = title || 'Confirmar';
  document.getElementById('modal-body').textContent  = body  || '¿Está seguro?';
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-ok').onclick = () => {
    document.getElementById('modal-overlay').classList.remove('open');
    if (onConfirm) onConfirm();
  };
}

init();

