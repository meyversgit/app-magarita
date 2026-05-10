import pyodbc
try:
    cs = 'Driver={ODBC Driver 17 for SQL Server};Server=100.93.182.26;Database=DB_CONDOMINIOS;UID=Lily;PWD=123456789;'
    conn = pyodbc.connect(cs)
    c = conn.cursor()
    c.execute("""SELECT i.id AS IdIncidencia, i.residente_id AS ResidenteId,
                     i.titulo AS Titulo, i.descripcion AS Descripcion,
                     i.categoria AS Categoria, i.prioridad AS Prioridad,
                     i.ubicacion AS Ubicacion, i.estado AS Estado,
                     i.fecha_reporte AS FechaReporte,
                     i.fecha_actualizacion AS FechaActualizacion,
                     r.Nombre + ' ' + r.Apellido AS ResidenteNombre,
                     r.Apartamento AS Apartamento
                     FROM incidencia i
                     LEFT JOIN residente r ON i.residente_id = r.id
                     ORDER BY i.fecha_reporte DESC""")
    print("Success")
except Exception as e:
    print(f"Error: {e}")
