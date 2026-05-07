"""
CondoManager — Auth + Admin Backend (Flask + SQL Server)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pyodbc

app = Flask(__name__)
CORS(app)

# ── Configuración de Base de Datos ────────────────────────────────────────────
CONNECTION_STRING = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=Meyvers;"
    "Database=CondominioDB;"
    "UID=trabajo;"
    "PWD=meyversmarmolet.123;"
)

def get_db():
    return pyodbc.connect(CONNECTION_STRING)

# ── Helpers ───────────────────────────────────────────────────────────────────

def row_to_dict(row, cursor):
    """Convierte una fila de pyodbc en un diccionario usando los nombres de columna."""
    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, row))

def rows_to_list(rows, cursor):
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in rows]

def serialize(obj):
    """Serializa tipos especiales (datetime, date) a string."""
    import datetime
    if isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    return str(obj)

def safe_jsonify(data):
    """Serializa una lista/dict manejando datetimes."""
    import json, datetime
    def default(o):
        if isinstance(o, (datetime.datetime, datetime.date)):
            return o.isoformat()
        raise TypeError
    return app.response_class(
        response=json.dumps(data, default=default),
        status=200,
        mimetype='application/json'
    )

# ── AUTH ──────────────────────────────────────────────────────────────────────

@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    nombre   = (data.get("nombre")   or "").strip()
    apellido = (data.get("apellido") or "").strip()
    correo   = (data.get("email")    or "").strip().lower()
    password = (data.get("password") or "")

    if not all([nombre, apellido, correo, password]):
        return jsonify({"message": "Todos los campos son obligatorios."}), 400

    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT IdUsuario FROM Usuarios WHERE Correo = ?", (correo,))
        if cursor.fetchone():
            return jsonify({"message": "Ya existe una cuenta con ese correo electrónico."}), 409
        cursor.execute(
            "INSERT INTO Usuarios (Password, IdRol, Nombre, Apellido, Correo, FechaRegistro) VALUES (?, ?, ?, ?, ?, GETDATE())",
            (password, 2, nombre, apellido, correo)
        )
        conn.commit()
        return jsonify({"message": "Cuenta creada exitosamente."}), 201
    except Exception as e:
        print(f"Error en Register: {e}")
        return jsonify({"message": "Error interno de base de datos."}), 500
    finally:
        if conn: conn.close()


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    correo   = (data.get("email")    or "").strip().lower()
    password = (data.get("password") or "")

    if not correo or not password:
        return jsonify({"message": "Correo y contraseña son obligatorios."}), 400

    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT Nombre, Apellido, Password, IdRol, Correo, FechaRegistro FROM Usuarios WHERE Correo = ?",
            (correo,)
        )
        row = cursor.fetchone()
        if not row or row.Password != password:
            return jsonify({"message": "Correo o contraseña incorrectos."}), 401
        return safe_jsonify({
            "message": "Sesión iniciada.",
            "user": {
                "nombre":   row.Nombre,
                "apellido": row.Apellido,
                "email":    row.Correo,
                "rol":      row.IdRol,
                "fechaRegistro": row.FechaRegistro
            }
        })
    except Exception as e:
        print(f"Error en Login: {e}")
        return jsonify({"message": "Error interno de base de datos."}), 500
    finally:
        if conn: conn.close()


# ── RESIDENTES ────────────────────────────────────────────────────────────────

@app.route("/api/residentes", methods=["GET"])
def get_residentes():
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Residentes ORDER BY FechaRegistro DESC")
        rows = cursor.fetchall()
        return safe_jsonify(rows_to_list(rows, cursor))
    except Exception as e:
        print(f"Error en GET residentes: {e}")
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()


@app.route("/api/residentes/<int:id>", methods=["GET"])
def get_residente(id):
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Residentes WHERE IdResidente = ?", (id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"message": "Residente no encontrado."}), 404
        return safe_jsonify(row_to_dict(row, cursor))
    except Exception as e:
        print(f"Error en GET residente {id}: {e}")
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()


@app.route("/api/residentes", methods=["POST"])
def create_residente():
    data = request.get_json(silent=True) or {}
    nombre   = (data.get("nombre")   or "").strip()
    apellido = (data.get("apellido") or "").strip()
    if not nombre or not apellido:
        return jsonify({"message": "Nombre y apellido son obligatorios."}), 400

    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO Residentes (Nombre, Apellido, Cedula, Telefono, Email, Apartamento, Piso, Estado, Tipo, FechaIngreso, Notas)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            nombre,
            apellido,
            data.get("cedula", ""),
            data.get("telefono", ""),
            data.get("correo", ""),
            data.get("apartamento", ""),
            data.get("piso") or None,
            data.get("estado", "Activo"),
            data.get("contrato", "Propietario"),
            data.get("fechaIngreso") or None,
            data.get("notas", "")
        ))
        conn.commit()
        return jsonify({"message": "Residente registrado exitosamente."}), 201
    except Exception as e:
        print(f"Error en POST residente: {e}")
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()


@app.route("/api/residentes/<int:id>", methods=["PUT"])
def update_residente(id):
    data = request.get_json(silent=True) or {}
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE Residentes SET
                Nombre = ?, Apellido = ?, Cedula = ?, Telefono = ?, Email = ?,
                Apartamento = ?, Piso = ?, Estado = ?, Tipo = ?, FechaIngreso = ?, Notas = ?
            WHERE IdResidente = ?
        """, (
            data.get("nombre", ""),
            data.get("apellido", ""),
            data.get("cedula", ""),
            data.get("telefono", ""),
            data.get("correo", ""),
            data.get("apartamento", ""),
            data.get("piso") or None,
            data.get("estado", "Activo"),
            data.get("contrato", "Propietario"),
            data.get("fechaIngreso") or None,
            data.get("notas", ""),
            id
        ))
        conn.commit()
        return jsonify({"message": "Residente actualizado exitosamente."})
    except Exception as e:
        print(f"Error en PUT residente {id}: {e}")
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()


# ── NOTIFICACIONES ────────────────────────────────────────────────────────────

@app.route("/api/notificaciones", methods=["GET"])
def get_notificaciones():
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Notificaciones ORDER BY FechaCreacion DESC")
        rows = cursor.fetchall()
        return safe_jsonify(rows_to_list(rows, cursor))
    except Exception as e:
        print(f"Error en GET notificaciones: {e}")
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()


@app.route("/api/notificaciones", methods=["POST"])
def create_notificacion():
    data = request.get_json(silent=True) or {}
    titulo  = (data.get("titulo")  or "").strip()
    mensaje = (data.get("mensaje") or "").strip()
    if not titulo or not mensaje:
        return jsonify({"message": "Título y mensaje son obligatorios."}), 400

    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO Notificaciones (Titulo, Mensaje, Tipo) VALUES (?, ?, ?)",
            (titulo, mensaje, data.get("tipo", "general"))
        )
        conn.commit()
        return jsonify({"message": "Notificación creada exitosamente."}), 201
    except Exception as e:
        print(f"Error en POST notificacion: {e}")
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()


@app.route("/api/notificaciones/<int:id>/leer", methods=["PUT"])
def marcar_leida(id):
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE Notificaciones SET Leida = 1 WHERE IdNotificacion = ?", (id,))
        conn.commit()
        return jsonify({"message": "Notificación marcada como leída."})
    except Exception as e:
        print(f"Error marcando leída {id}: {e}")
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()


# ── INCIDENCIAS ───────────────────────────────────────────────────────────────

@app.route("/api/incidencias", methods=["GET"])
def get_incidencias():
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Incidencias ORDER BY FechaReporte DESC")
        rows = cursor.fetchall()
        return safe_jsonify(rows_to_list(rows, cursor))
    except Exception as e:
        print(f"Error en GET incidencias: {e}")
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()


@app.route("/api/incidencias/<int:id>/estado", methods=["PUT"])
def update_estado_incidencia(id):
    data = request.get_json(silent=True) or {}
    estado = (data.get("estado") or "").strip()
    if estado not in ["Abierta", "En proceso", "Resuelta"]:
        return jsonify({"message": "Estado inválido. Use: Abierta, En proceso, Resuelta."}), 400

    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        if estado == "Resuelta":
            cursor.execute(
                "UPDATE Incidencias SET Estado = ?, FechaResolucion = GETDATE() WHERE IdIncidencia = ?",
                (estado, id)
            )
        else:
            cursor.execute(
                "UPDATE Incidencias SET Estado = ?, FechaResolucion = NULL WHERE IdIncidencia = ?",
                (estado, id)
            )
        conn.commit()
        return jsonify({"message": f"Incidencia actualizada a '{estado}'."})
    except Exception as e:
        print(f"Error en PUT incidencia {id}: {e}")
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()


@app.route("/api/incidencias", methods=["POST"])
def create_incidencia():
    data = request.get_json(silent=True) or {}
    titulo = (data.get("titulo") or "").strip()
    if not titulo:
        return jsonify({"message": "El título es obligatorio."}), 400
    conn = None
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO Incidencias (Titulo, Descripcion, Ubicacion, Prioridad) VALUES (?, ?, ?, ?)",
            (titulo, data.get("descripcion", ""), data.get("ubicacion", ""), data.get("prioridad", "Normal"))
        )
        conn.commit()
        return jsonify({"message": "Incidencia creada."}), 201
    except Exception as e:
        print(f"Error en POST incidencia: {e}")
        return jsonify({"message": str(e)}), 500
    finally:
        if conn: conn.close()


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("CondoManager API running at http://localhost:5000")
    app.run(debug=True, port=5000)
