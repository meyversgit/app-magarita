/* ── Tab switching ── */
function show(id) {
  document.querySelectorAll('.form').forEach(f => f.classList.remove('visible'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const f = document.getElementById('form-' + id);
  f.classList.remove('visible');
  void f.offsetWidth;
  f.classList.add('visible');
  document.getElementById('tab-' + id).classList.add('active');
}

// Open register tab if URL has ?tab=register
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('tab') === 'register') show('register');
});

/* ── Alerts ── */
function setAlert(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = 'alert ' + type;
}
function clearAlert(id) {
  const el = document.getElementById(id);
  el.textContent = '';
  el.className = 'alert';
}

/* ── LOGIN ── */
async function doLogin() {
  clearAlert('login-alert');
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    setAlert('login-alert', 'Por favor completa todos los campos.', 'error');
    return;
  }

  try {
    const res = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      // Save user info for the admin panel profile
      sessionStorage.setItem('condoUser', JSON.stringify(data.user));
      setAlert('login-alert', '¡Inicio de sesión exitoso!', 'success');
      setTimeout(() => { window.location.href = 'paneladmin.html'; }, 800);
    } else {
      setAlert('login-alert', data.message || 'Credenciales incorrectas.', 'error');
    }
  } catch (err) {
    setAlert('login-alert', 'No se pudo conectar con el servidor.', 'error');
  }
}

/* ── REGISTER ── */
async function doRegister() {
  clearAlert('register-alert');
  const nombre    = document.getElementById('reg-nombre').value.trim();
  const apellido  = document.getElementById('reg-apellido').value.trim();
  const email     = document.getElementById('reg-email').value.trim();
  const password  = document.getElementById('reg-password').value;
  const password2 = document.getElementById('reg-password2').value;
  const terms     = document.getElementById('reg-terms').checked;

  if (!nombre || !apellido || !email || !password || !password2) {
    setAlert('register-alert', 'Por favor completa todos los campos.', 'error'); return;
  }
  if (password !== password2) {
    setAlert('register-alert', 'Las contraseñas no coinciden.', 'error'); return;
  }
  if (password.length < 8) {
    setAlert('register-alert', 'La contraseña debe tener al menos 8 caracteres.', 'error'); return;
  }
  if (!terms) {
    setAlert('register-alert', 'Debes aceptar los términos de servicio.', 'error'); return;
  }

  try {
    const res = await fetch('http://localhost:5000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, apellido, email, password })
    });
    const data = await res.json();
    if (res.ok) {
      setAlert('register-alert', '¡Cuenta creada exitosamente! Redirigiendo...', 'success');
      setTimeout(() => { show('login'); }, 1200);
    } else {
      setAlert('register-alert', data.message || 'Error al crear la cuenta.', 'error');
    }
  } catch (err) {
    setAlert('register-alert', 'No se pudo conectar con el servidor.', 'error');
  }
}
