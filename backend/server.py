"""
CondoManager — Backend (Flask + SQL Server)
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import pyodbc, json, datetime, decimal

app = Flask(__name__)
CORS(app)

CONNECTION_STRING = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=100.93.182.26;"
    "Database=DB_CONDOMINIOS;"
    "UID=Lily;PWD=123456789;"
)

def get_db():
    return pyodbc.connect(CONNECTION_STRING)

def rows_to_list(rows, cursor):
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, r)) for r in rows]

def row_to_dict(row, cursor):
    cols = [d[0] for d in cursor.description]
    return dict(zip(cols, row))

def serial(o):
    if isinstance(o, (datetime.datetime, datetime.date)): return o.isoformat()
    if isinstance(o, decimal.Decimal): return float(o)
    return str(o)

def ok(data, status=200):
    return app.response_class(json.dumps(data, default=serial), status=status, mimetype='application/json')

# ── AUTH ──────────────────────────────────────────────────────

@app.route("/api/register", methods=["POST"])
def register():
    d = request.get_json(silent=True) or {}
    nombre = (d.get("nombre") or "").strip()
    apellido = (d.get("apellido") or "").strip()
    correo = (d.get("email") or "").strip().lower()
    telefono = (d.get("telefono") or "").strip()
    pwd = d.get("password") or ""
    if not all([nombre, apellido, correo, pwd]):
        return jsonify({"message": "Todos los campos obligatorios excepto el telefono."}), 400
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("SELECT id FROM usuario WHERE email=?", (correo,))
        if c.fetchone(): return jsonify({"message": "Ya existe una cuenta con ese correo."}), 409
        c.execute("INSERT INTO usuario (nombre,apellido,email,telefono,password_hash,rol,activo,created_at) OUTPUT INSERTED.id VALUES(?,?,?,?,?, 'residente',1,GETDATE())",
                  (nombre, apellido, correo, telefono, pwd))
        row = c.fetchone()
        if not row: return jsonify({"message": "Error al crear usuario"}), 500
        uid = row[0]
        
        # Obtener un apartamento disponible o el primero
        c.execute("SELECT TOP 1 id FROM apartamento")
        apt_row = c.fetchone()
        if not apt_row: return jsonify({"message": "No hay apartamentos registrados. Contacte al admin."}), 500
        apto_id = apt_row[0]
        
        c.execute("INSERT INTO residente (usuario_id, apartamento_id, fecha_ingreso, propietario) VALUES (?, ?, GETDATE(), 0)",
                  (uid, apto_id))
        
        conn.commit()
        return jsonify({"message": "Cuenta creada exitosamente."}), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/login", methods=["POST"])
def login():
    d = request.get_json(silent=True) or {}
    correo = (d.get("email") or "").strip().lower()
    pwd = d.get("password") or ""
    if not correo or not pwd:
        return jsonify({"message": "Correo y contraseña son obligatorios."}), 400
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("SELECT id, nombre, apellido, password_hash, rol, email, created_at FROM usuario WHERE email=?", (correo,))
        row = c.fetchone()
        if not row or row.password_hash != pwd:
            return jsonify({"message": "Correo o contraseña incorrectos."}), 401
        return ok({"message": "Sesion iniciada.", "user": {
            "id": row.id,
            "nombre": row.nombre, "apellido": row.apellido,
            "email": row.email, "rol": row.rol, "fechaRegistro": row.created_at
        }})
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

# ── DASHBOARD ─────────────────────────────────────────────────

@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM residente"); total = c.fetchone()[0]
        try:
            c.execute("SELECT COUNT(*) FROM pago WHERE estado='pendiente'"); pend = c.fetchone()[0]
        except: pend = 0
        try:
            c.execute("SELECT COUNT(*) FROM incidencia WHERE estado IN ('abierta','en_proceso')"); inc = c.fetchone()[0]
        except: inc = 0
        try:
            c.execute("SELECT ISNULL(SUM(monto_pagado),0) FROM pago WHERE estado='pagado' AND MONTH(fecha_pago)=MONTH(GETDATE()) AND YEAR(fecha_pago)=YEAR(GETDATE())")
            rec = float(c.fetchone()[0])
        except: rec = 0.0
        c.execute("""
            SELECT TOP 5 r.id AS IdResidente, u.nombre AS Nombre, u.apellido AS Apellido,
                   a.numero AS Apartamento, r.fecha_ingreso AS FechaIngreso
            FROM residente r
            JOIN usuario u ON r.usuario_id=u.id
            JOIN apartamento a ON r.apartamento_id=a.id
            ORDER BY r.fecha_ingreso DESC
        """)
        ultimos = rows_to_list(c.fetchall(), c)
        return ok({"totalResidentes": total, "pagosPendientes": pend,
                   "incidenciasActivas": inc, "recaudacionMes": rec, "ultimosResidentes": ultimos})
    except Exception as e:
        print("Dashboard error:", e)
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/reservas", methods=["GET"])
def get_reservas_admin():
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("""SELECT r.id AS IdReserva, r.residente_id AS ResidenteId,
                     ac.nombre AS Area, r.fecha AS Fecha,
                     r.hora_inicio AS Hora, r.estado AS Estado,
                     u.nombre + ' ' + u.apellido AS ResidenteNombre,
                     a.numero AS Apartamento
                     FROM reserva r
                     LEFT JOIN area_comun ac ON r.area_id = ac.id
                     LEFT JOIN residente res ON r.residente_id = res.id
                     LEFT JOIN usuario u ON res.usuario_id = u.id
                     LEFT JOIN apartamento a ON res.apartamento_id = a.id
                     ORDER BY r.fecha DESC""")
        return ok(rows_to_list(c.fetchall(), c))
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/reservas/<int:id>/estado", methods=["PUT"])
def update_reserva_estado(id):
    d = request.get_json(silent=True) or {}
    estado = d.get("estado", "pendiente")
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("UPDATE reserva SET estado=? WHERE id=?", (estado, id))
        conn.commit()
        return jsonify({"message": f"Reserva actualizada a '{estado}'."})
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

# ── RESIDENTES ────────────────────────────────────────────────

@app.route("/api/residentes", methods=["GET"])
def get_residentes():
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("""
            SELECT r.id AS IdResidente, u.nombre AS Nombre, u.apellido AS Apellido,
                   u.email AS Email, u.telefono AS Telefono,
                   a.numero AS Apartamento, a.piso AS Piso,
                   r.fecha_ingreso AS FechaIngreso,
                   CASE r.propietario WHEN 1 THEN 'Propietario' ELSE 'Arrendatario' END AS Tipo,
                   r.usuario_id AS UsuarioId, r.apartamento_id AS ApartamentoId,
                   'Activo' AS Estado
            FROM residente r
            JOIN usuario u ON r.usuario_id=u.id
            JOIN apartamento a ON r.apartamento_id=a.id
            ORDER BY r.fecha_ingreso DESC
        """)
        return ok(rows_to_list(c.fetchall(), c))
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/residentes/<int:id>", methods=["GET"])
def get_residente(id):
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("""
            SELECT r.id AS IdResidente, u.nombre AS Nombre, u.apellido AS Apellido,
                   u.email AS Email, u.telefono AS Telefono,
                   a.numero AS Apartamento, a.piso AS Piso,
                   r.fecha_ingreso AS FechaIngreso,
                   CASE r.propietario WHEN 1 THEN 'Propietario' ELSE 'Arrendatario' END AS Tipo,
                   'Activo' AS Estado
            FROM residente r
            JOIN usuario u ON r.usuario_id=u.id
            JOIN apartamento a ON r.apartamento_id=a.id
            WHERE r.id=?
        """, (id,))
        row = c.fetchone()
        if not row: return jsonify({"message": "No encontrado."}), 404
        return ok(row_to_dict(row, c))
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/residentes", methods=["POST"])
def create_residente():
    d = request.get_json(silent=True) or {}
    nombre = (d.get("nombre") or "").strip()
    apellido = (d.get("apellido") or "").strip()
    if not nombre or not apellido:
        return jsonify({"message": "Nombre y apellido son obligatorios."}), 400
    correo = (d.get("correo") or "").strip().lower()
    telefono = (d.get("telefono") or "").strip()
    apto_num = (d.get("apartamento") or "").strip()
    piso = d.get("piso") or 1
    propietario = 1 if d.get("contrato","") == "Propietario" else 0
    fecha_ingreso = d.get("fechaIngreso") or None
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        # Usuario
        uid = None
        if correo:
            c.execute("SELECT id FROM usuario WHERE email=?", (correo,))
            row = c.fetchone()
            if row: uid = row[0]
        if not uid:
            email_uso = correo or f"{nombre.lower()}.{apellido.lower()}@condo.local"
            c.execute("INSERT INTO usuario(nombre,apellido,email,telefono,password_hash,rol,activo,created_at) VALUES(?,?,?,?,?,'residente',1,GETDATE())",
                      (nombre, apellido, email_uso, telefono, d.get("cedula","") or "condo123"))
            conn.commit()
            c.execute("SELECT id FROM usuario WHERE email=?", (email_uso,))
            uid = c.fetchone()[0]
        else:
            c.execute("UPDATE usuario SET nombre=?,apellido=?,telefono=? WHERE id=?", (nombre, apellido, telefono, uid))
        # Apartamento
        if apto_num:
            c.execute("SELECT id FROM apartamento WHERE numero=?", (apto_num,))
            row = c.fetchone()
            if row: apto_id = row[0]
            else:
                c.execute("INSERT INTO apartamento(numero,piso,tipo) VALUES(?,?,'Standard')", (apto_num, piso))
                conn.commit()
                c.execute("SELECT id FROM apartamento WHERE numero=?", (apto_num,))
                apto_id = c.fetchone()[0]
        else:
            c.execute("SELECT TOP 1 id FROM apartamento ORDER BY id"); apto_id = c.fetchone()[0]
        c.execute("INSERT INTO residente(usuario_id,apartamento_id,fecha_ingreso,propietario) VALUES(?,?,?,?)",
                  (uid, apto_id, fecha_ingreso, propietario))
        conn.commit()
        return jsonify({"message": "Residente registrado exitosamente."}), 201
    except Exception as e:
        print("POST residente:", e)
        if conn:
            try: conn.rollback()
            except: pass
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/residentes/<int:id>", methods=["PUT"])
def update_residente(id):
    d = request.get_json(silent=True) or {}
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("SELECT usuario_id, apartamento_id FROM residente WHERE id=?", (id,))
        row = c.fetchone()
        if not row: return jsonify({"message": "No encontrado."}), 404
        uid, apto_id = row[0], row[1]
        c.execute("UPDATE usuario SET nombre=?,apellido=?,telefono=? WHERE id=?",
                  (d.get("nombre",""), d.get("apellido",""), d.get("telefono",""), uid))
        apto_num = (d.get("apartamento") or "").strip()
        if apto_num:
            c.execute("SELECT id FROM apartamento WHERE numero=?", (apto_num,))
            row2 = c.fetchone()
            if row2: apto_id = row2[0]
        propietario = 1 if d.get("contrato","") == "Propietario" else 0
        c.execute("UPDATE residente SET apartamento_id=?,fecha_ingreso=?,propietario=? WHERE id=?",
                  (apto_id, d.get("fechaIngreso") or None, propietario, id))
        conn.commit()
        return jsonify({"message": "Residente actualizado exitosamente."})
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

# ── PAGOS ─────────────────────────────────────────────────────

@app.route("/api/pagos", methods=["GET"])
def get_pagos():
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("""
            SELECT p.id AS IdPago, p.residente_id AS ResidenteId,
                   u.nombre AS Nombre, u.apellido AS Apellido,
                   a.numero AS Apartamento,
                   ISNULL(cm.descripcion,'Mantenimiento') AS Concepto,
                   p.monto_pagado AS Monto, p.metodo_pago AS MetodoPago,
                   p.fecha_pago AS FechaPago, p.estado AS Estado,
                   p.comprobante_url AS Referencia
            FROM pago p
            JOIN residente r ON p.residente_id=r.id
            JOIN usuario u ON r.usuario_id=u.id
            JOIN apartamento a ON r.apartamento_id=a.id
            LEFT JOIN cuota_mantenimiento cm ON p.cuota_id=cm.id
            ORDER BY p.fecha_pago DESC
        """)
        return ok(rows_to_list(c.fetchall(), c))
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/pagos", methods=["POST"])
def create_pago():
    d = request.get_json(silent=True) or {}
    res_id = d.get("residente_id")
    monto = d.get("monto")
    if not res_id or monto is None:
        return jsonify({"message": "residente_id y monto son obligatorios."}), 400
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("SELECT TOP 1 id FROM cuota_mantenimiento WHERE activa=1 ORDER BY id")
        cuota_row = c.fetchone()
        cuota_id = cuota_row[0] if cuota_row else None
        c.execute("""INSERT INTO pago(residente_id,cuota_id,monto_pagado,fecha_pago,metodo_pago,estado)
                     VALUES(?,?,?,?,?,?)""",
                  (res_id, cuota_id, float(monto),
                   d.get("fecha_pago") or datetime.date.today().isoformat(),
                   d.get("metodo_pago","Efectivo"), d.get("estado","pagado")))
        conn.commit()
        return jsonify({"message": "Pago registrado exitosamente."}), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

# ── USUARIOS ──────────────────────────────────────────────────

@app.route("/api/usuarios", methods=["GET"])
def get_usuarios():
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("SELECT id, nombre, apellido, email, telefono, rol, activo, created_at FROM usuario ORDER BY id DESC")
        return ok(rows_to_list(c.fetchall(), c))
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/usuarios/<int:id>", methods=["PUT"])
def update_usuario(id):
    d = request.get_json(silent=True) or {}
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("UPDATE usuario SET rol=?, activo=? WHERE id=?",
                  (d.get("rol", "residente"), d.get("activo", 1), id))
        conn.commit()
        return jsonify({"message": "Usuario actualizado exitosamente."})
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

# ── RESIDENTE SPECIFIC ────────────────────────────────────────

@app.route("/api/residente/data/<int:user_id>", methods=["GET"])
def get_residente_data(user_id):
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        # Info básica
        c.execute("""SELECT r.id AS IdResidente, u.nombre AS Nombre, u.apellido AS Apellido, 
                            u.email AS Email, u.telefono AS Telefono, a.numero AS Apartamento, 
                            a.piso AS Piso, u.activo AS Activo, r.fecha_ingreso AS FechaIngreso
                     FROM residente r 
                     JOIN usuario u ON r.usuario_id = u.id
                     JOIN apartamento a ON r.apartamento_id = a.id
                     WHERE u.id = ?""", (user_id,))
        row = c.fetchone()
        if not row:
            # Auto-crear residente si no existe
            c.execute("SELECT TOP 1 id FROM apartamento")
            apt_row = c.fetchone()
            apto_id = apt_row[0] if apt_row else 1
            
            c.execute("INSERT INTO residente (usuario_id, apartamento_id, fecha_ingreso, propietario) OUTPUT INSERTED.id VALUES (?, ?, GETDATE(), 0)",
                      (user_id, apto_id))
            rid = c.fetchone()[0]
            conn.commit()

            
            # Refetch
            c.execute("""SELECT r.id AS IdResidente, u.nombre AS Nombre, u.apellido AS Apellido, 
                                u.email AS Email, u.telefono AS Telefono, a.numero AS Apartamento, 
                                a.piso AS Piso, u.activo AS Activo, r.fecha_ingreso AS FechaIngreso
                         FROM residente r 
                         JOIN usuario u ON r.usuario_id = u.id
                         JOIN apartamento a ON r.apartamento_id = a.id
                         WHERE u.id = ?""", (user_id,))
            row = c.fetchone()
        
        res_info = row_to_dict(row, c)
        rid = res_info['IdResidente']
        
        # Stats
        c.execute("SELECT COUNT(*) FROM pago WHERE residente_id=? AND estado='pendiente'", (rid,))
        pagos_pend = c.fetchone()[0]
        
        c.execute("SELECT SUM(monto_pagado) FROM pago WHERE residente_id=? AND estado='pagado'", (rid,))
        total_pagado = float(c.fetchone()[0] or 0)
        
        c.execute("SELECT COUNT(*) FROM incidencia WHERE residente_id=? AND estado IN ('abierta', 'en_proceso')", (rid,))
        inc_activas = c.fetchone()[0]
        
        # Reservas (mock por ahora si no hay tabla, o usar tabla si existe)
        # c.execute("SELECT COUNT(*) FROM reserva WHERE residente_id=? AND fecha >= GETDATE()", (rid,))
        # reservas = c.fetchone()[0]
        
        res_info['stats'] = {
            'pagosPendientes': pagos_pend,
            'totalPagadoAnio': total_pagado,
            'incidenciasActivas': inc_activas,
            'reservasActivas': 0 # Mock
        }
        
        return ok(res_info)
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/residente/pagos/<int:user_id>", methods=["GET"])
def get_residente_pagos(user_id):
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("""SELECT p.id AS IdPago, ISNULL(cm.descripcion,'Mantenimiento') AS Concepto, 
                            p.monto_pagado AS Monto, p.metodo_pago AS MetodoPago, 
                            p.fecha_pago AS FechaPago, p.estado AS Estado, p.comprobante_url AS Referencia
                     FROM pago p
                     JOIN residente r ON p.residente_id = r.id
                     LEFT JOIN cuota_mantenimiento cm ON p.cuota_id = cm.id
                     WHERE r.usuario_id = ?
                     ORDER BY p.fecha_pago DESC""", (user_id,))
        return ok(rows_to_list(c.fetchall(), c))
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/residente/incidencias/<int:user_id>", methods=["GET"])
def get_residente_incidencias(user_id):
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("""SELECT i.id AS IdIncidencia, i.titulo AS Titulo, i.descripcion AS Descripcion,
                            i.categoria AS Categoria, i.estado AS Estado, i.fecha_reporte AS FechaReporte
                     FROM incidencia i
                     JOIN residente r ON i.residente_id = r.id
                     WHERE r.usuario_id = ?
                     ORDER BY i.fecha_reporte DESC""", (user_id,))
        return ok(rows_to_list(c.fetchall(), c))
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

# ── NOTIFICACIONES ────────────────────────────────────────────

@app.route("/api/notificaciones/<int:user_id>", methods=["GET"])
def get_notificaciones(user_id):
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("""SELECT id AS IdNotificacion, usuario_id AS UsuarioId,
                     titulo AS Titulo, mensaje AS Mensaje, tipo AS Tipo,
                     leida AS Leida, fecha_envio AS FechaCreacion
                     FROM notificacion 
                     WHERE usuario_id IS NULL OR usuario_id = ?
                     ORDER BY fecha_envio DESC""", (user_id,))
        return ok(rows_to_list(c.fetchall(), c))
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/residente/actividad/<int:user_id>", methods=["GET"])
def get_residente_actividad(user_id):
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        # Traer últimos 2 pagos y últimas 2 incidencias
        c.execute("""SELECT 'pago' AS Clase, ISNULL(cm.descripcion, 'Mantenimiento') AS Titulo, 
                            p.monto_pagado AS Monto, p.estado AS Estado, p.fecha_pago AS Fecha
                     FROM pago p
                     JOIN residente r ON p.residente_id = r.id
                     LEFT JOIN cuota_mantenimiento cm ON p.cuota_id = cm.id
                     WHERE r.usuario_id = ?
                     ORDER BY p.fecha_pago DESC OFFSET 0 ROWS FETCH NEXT 2 ROWS ONLY""", (user_id,))
        pagos = rows_to_list(c.fetchall(), c)
        
        c.execute("""SELECT 'incidencia' AS Clase, i.titulo AS Titulo, 
                            i.descripcion AS Mensaje, i.estado AS Estado, i.fecha_reporte AS Fecha
                     FROM incidencia i
                     JOIN residente r ON i.residente_id = r.id
                     WHERE r.usuario_id = ?
                     ORDER BY i.fecha_reporte DESC OFFSET 0 ROWS FETCH NEXT 2 ROWS ONLY""", (user_id,))
        incs = rows_to_list(c.fetchall(), c)
        
        return ok({"pagos": pagos, "incidencias": incs})
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/residente/incidencia", methods=["POST"])
def post_residente_incidencia():
    conn = None
    try:
        data = request.json
        uid = data.get('usuario_id')
        titulo = data.get('titulo')
        desc = data.get('descripcion')
        cat = data.get('categoria')
        prio = data.get('prioridad', 'Baja')
        ubi = data.get('ubicacion', 'No especificada')
        
        if not uid: return jsonify({"message": "ID de usuario inválido o sesión expirada"}), 401
        
        conn = get_db(); c = conn.cursor()
        # Obtener id del residente
        c.execute("SELECT id FROM residente WHERE usuario_id=?", (uid,))
        row = c.fetchone()
        
        if not row:
            # Auto-crear residente si no existe
            c.execute("SELECT TOP 1 id FROM apartamento")
            apt_row = c.fetchone()
            if not apt_row: return jsonify({"message": "No hay apartamentos disponibles"}), 500
            apto_id = apt_row[0]
            
            c.execute("INSERT INTO residente (usuario_id, apartamento_id, fecha_ingreso, propietario) OUTPUT INSERTED.id VALUES (?, ?, GETDATE(), 0)",
                      (uid, apto_id))
            rid = c.fetchone()[0]
        else:
            rid = row[0]
        
        c.execute("""INSERT INTO incidencia (residente_id, titulo, descripcion, categoria, prioridad, ubicacion, estado, fecha_reporte)
                     VALUES (?, ?, ?, ?, ?, ?, 'abierta', GETDATE())""", (rid, titulo, desc, cat, prio, ubi))
        conn.commit()
        return jsonify({"message": "Incidencia reportada exitosamente"}), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/residente/reserva", methods=["POST"])
def post_residente_reserva():
    conn = None
    try:
        data = request.json
        uid = data.get('usuario_id')
        area = data.get('area')
        fecha = data.get('fecha')
        hora_i = data.get('hora_inicio')
        hora_f = data.get('hora_fin', '12:00') # Default si no viene
        
        if not uid: return jsonify({"message": "ID de usuario inválido o sesión expirada"}), 401
        
        conn = get_db(); c = conn.cursor()
        c.execute("SELECT id FROM residente WHERE usuario_id=?", (uid,))
        row = c.fetchone()
        
        if not row:
            # Auto-crear residente si no existe
            c.execute("SELECT TOP 1 id FROM apartamento")
            apt_row = c.fetchone()
            if not apt_row: return jsonify({"message": "No hay apartamentos disponibles"}), 500
            apto_id = apt_row[0]
            
            c.execute("INSERT INTO residente (usuario_id, apartamento_id, fecha_ingreso, propietario) OUTPUT INSERTED.id VALUES (?, ?, GETDATE(), 0)",
                      (uid, apto_id))
            rid = c.fetchone()[0]
        else:
            rid = row[0]
        
        # Mapear nombre de área a ID
        area_map = {
            'salon': 'Salón Social',
            'piscina': 'Piscina',
            'gym': 'Gimnasio',
            'bbq': 'Área BBQ'
        }
        real_name = area_map.get(area, area)
        
        c.execute("SELECT id FROM area_comun WHERE nombre=?", (real_name,))
        area_row = c.fetchone()
        if not area_row:
            # Fallback a la primera área si no coincide el nombre
            c.execute("SELECT TOP 1 id FROM area_comun")
            area_row = c.fetchone()
        
        area_id = area_row[0] if area_row else 1
        
        c.execute("""INSERT INTO reserva (residente_id, area_id, fecha, hora_inicio, hora_fin, estado)
                     VALUES (?, ?, ?, ?, ?, 'pendiente')""", (rid, area_id, fecha, hora_i, hora_f))
        conn.commit()
        return jsonify({"message": "Solicitud de reserva enviada"}), 201
    except Exception as e:
        # Si no existe la tabla reserva, crearla o manejar el error
        return jsonify({"message": f"Error al reservar: {str(e)}"}), 500
    finally:
        if conn: conn.close()

@app.route("/api/residente/reservas/<int:uid>", methods=["GET"])
def get_residente_reservas(uid):
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("SELECT id FROM residente WHERE usuario_id=?", (uid,))
        row = c.fetchone()
        if not row: return ok([])
        rid = row[0]
        c.execute("""SELECT r.id, ac.nombre AS area, r.fecha, r.hora_inicio, r.hora_fin, r.estado
                     FROM reserva r
                     JOIN area_comun ac ON r.area_id = ac.id
                     WHERE r.residente_id = ?
                     ORDER BY r.fecha DESC""", (rid,))
        return ok(rows_to_list(c.fetchall(), c))
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/residente/reservas/<int:id>", methods=["DELETE"])
def cancel_residente_reserva(id):
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        # Solo permitir cancelar si está pendiente o aprobada (lógica simple)
        c.execute("DELETE FROM reserva WHERE id=?", (id,))
        conn.commit()
        return jsonify({"message": "Reserva cancelada correctamente."})
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()
@app.route("/api/residente/reservas/<int:id>", methods=["PUT"])
def update_residente_reserva(id):
    conn = None
    try:
        data = request.get_json(silent=True) or {}
        area = data.get('area')
        fecha = data.get('fecha')
        hora_i = data.get('hora_inicio')
        hora_f = data.get('hora_fin')
        
        # Mapear nombre de área a ID
        area_map = { 'salon': 'Salón Social', 'piscina': 'Piscina', 'gym': 'Gimnasio', 'bbq': 'Área BBQ' }
        real_name = area_map.get(area, area)
        
        conn = get_db(); c = conn.cursor()
        c.execute("SELECT id FROM area_comun WHERE nombre=?", (real_name,))
        area_row = c.fetchone()
        area_id = area_row[0] if area_row else 1
        
        c.execute("""UPDATE reserva 
                     SET area_id=?, fecha=?, hora_inicio=?, hora_fin=?
                     WHERE id=?""", (area_id, fecha, hora_i, hora_f, id))
        conn.commit()
        return jsonify({"message": "Reserva actualizada correctamente."})
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()
    d = request.get_json(silent=True) or {}
    titulo = (d.get("titulo") or "").strip()
    mensaje = (d.get("mensaje") or "").strip()
    if not titulo or not mensaje:
        return jsonify({"message": "Titulo y mensaje son obligatorios."}), 400
    tipo_map = {"general":"anuncio","urgente":"anuncio","mantenimiento":"otro",
                "evento":"anuncio","cobro":"pago","anuncio":"anuncio",
                "pago":"pago","incidencia":"incidencia","reserva":"reserva"}
    tipo = tipo_map.get(d.get("tipo","general"), "anuncio")
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("SELECT TOP 1 id FROM usuario ORDER BY id")
        uid = c.fetchone()[0]
        c.execute("INSERT INTO notificacion(usuario_id,titulo,mensaje,tipo,leida,fecha_envio) VALUES(?,?,?,?,0,GETDATE())",
                  (uid, titulo, mensaje, tipo))
        conn.commit()
        return jsonify({"message": "Notificacion creada exitosamente."}), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/notificaciones/<int:id>/leer", methods=["PUT"])
def marcar_leida(id):
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("UPDATE notificacion SET leida=1 WHERE id=?", (id,))
        conn.commit()
        return jsonify({"message": "Marcada como leida."})
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

# ── PERFIL Y PAGOS ───────────────────────────────────────────

@app.route("/api/residente/perfil/<int:uid>", methods=["GET", "PUT"])
def manage_perfil(uid):
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        if request.method == "GET":
            c.execute("SELECT id FROM residente WHERE usuario_id=?", (uid,))
            if not c.fetchone():
                c.execute("SELECT TOP 1 id FROM apartamento")
                apt_row = c.fetchone()
                if apt_row:
                    c.execute("INSERT INTO residente (usuario_id, apartamento_id, fecha_ingreso, propietario) VALUES (?, ?, GETDATE(), 0)", (uid, apt_row[0]))
                    conn.commit()
            
            c.execute("SELECT nombre, apellido, email, telefono FROM usuario WHERE id=?", (uid,))
            row = c.fetchone()
            if not row: return jsonify({"message": "Usuario no encontrado"}), 404
            return jsonify({
                "nombre": row[0], "apellido": row[1], "email": row[2], "telefono": row[3]
            })
        else:
            data = request.get_json(silent=True) or {}
            c.execute("""UPDATE usuario SET nombre=?, apellido=?, email=?, telefono=? WHERE id=?""",
                      (data.get('nombre'), data.get('apellido'), data.get('email'), data.get('telefono'), uid))
            conn.commit()
            return jsonify({"message": "Perfil actualizado correctamente"})
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()


@app.route("/api/residente/pago", methods=["POST"])
def submit_pago():
    conn = None
    try:
        data = request.get_json(silent=True) or {}
        uid = data.get('usuario_id')
        monto = data.get('monto')
        metodo = data.get('metodo')
        ref = data.get('referencia')
        
        conn = get_db(); c = conn.cursor()
        c.execute("SELECT id FROM residente WHERE usuario_id=?", (uid,))
        row = c.fetchone()
        if not row:
            return jsonify({"message": "Perfil de residente no encontrado."}), 404
        rid = row[0]
        
        c.execute("SELECT TOP 1 id FROM cuota_mantenimiento")
        cuota_row = c.fetchone()
        cuota_id = cuota_row[0] if cuota_row else 1
        
        c.execute("""INSERT INTO pago (residente_id, cuota_id, monto_pagado, fecha_pago, metodo_pago, comprobante_url, estado) 
                     VALUES (?, ?, ?, GETDATE(), ?, ?, 'pendiente')""", (rid, cuota_id, monto, metodo, ref))
        conn.commit()
        return jsonify({"message": "Pago registrado correctamente. Pendiente de verificación."})
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/incidencias", methods=["GET"])
def get_incidencias():
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("""SELECT i.id AS IdIncidencia, i.residente_id AS ResidenteId,
                     i.titulo AS Titulo, i.descripcion AS Descripcion,
                     i.categoria AS Categoria, i.prioridad AS Prioridad,
                     i.ubicacion AS Ubicacion, i.estado AS Estado,
                     i.fecha_reporte AS FechaReporte,
                     i.fecha_actualizacion AS FechaActualizacion,
                     u.nombre + ' ' + u.apellido AS ResidenteNombre,
                     a.numero AS Apartamento
                     FROM incidencia i
                     LEFT JOIN residente r ON i.residente_id = r.id
                     LEFT JOIN usuario u ON r.usuario_id = u.id
                     LEFT JOIN apartamento a ON r.apartamento_id = a.id
                     ORDER BY i.fecha_reporte DESC""")
        return ok(rows_to_list(c.fetchall(), c))
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/incidencias", methods=["POST"])
def create_incidencia():
    d = request.get_json(silent=True) or {}
    titulo = (d.get("titulo") or "").strip()
    if not titulo: return jsonify({"message": "El titulo es obligatorio."}), 400
    cat_map = {"Normal":"otro","Alta":"otro","Baja":"otro","plomeria":"plomeria",
               "electricidad":"electricidad","seguridad":"seguridad","limpieza":"limpieza"}
    cat = cat_map.get(d.get("prioridad","Normal"), "otro")
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("""INSERT INTO incidencia(residente_id,titulo,descripcion,categoria,estado,fecha_reporte,fecha_actualizacion)
                     VALUES(?,?,?,?,'abierta',GETDATE(),GETDATE())""",
                  (d.get("residente_id"), titulo, d.get("descripcion",""), cat))
        conn.commit()
        return jsonify({"message": "Incidencia creada."}), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()

@app.route("/api/incidencias/<int:id>/estado", methods=["PUT"])
def update_incidencia(id):
    d = request.get_json(silent=True) or {}
    estado_map = {"Abierta":"abierta","En proceso":"en_proceso","Resuelta":"resuelta","Cerrada":"cerrada"}
    estado = estado_map.get(d.get("estado",""), "")
    if not estado: return jsonify({"message": "Estado invalido."}), 400
    conn = None
    try:
        conn = get_db(); c = conn.cursor()
        c.execute("UPDATE incidencia SET estado=?,fecha_actualizacion=GETDATE() WHERE id=?", (estado, id))
        conn.commit()
        return jsonify({"message": f"Incidencia actualizada a '{estado}'."})
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()


if __name__ == "__main__":
    print("CondoManager API en http://localhost:5005")
    app.run(debug=True, port=5005)
