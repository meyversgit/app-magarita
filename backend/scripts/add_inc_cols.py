import pyodbc
cs = 'Driver={ODBC Driver 17 for SQL Server};Server=100.93.182.26;Database=DB_CONDOMINIOS;UID=Lily;PWD=123456789;'
conn = pyodbc.connect(cs)
c = conn.cursor()

# Agregar columnas faltantes a incidencia
try:
    c.execute("ALTER TABLE incidencia ADD prioridad NVARCHAR(20)")
except:
    pass

try:
    c.execute("ALTER TABLE incidencia ADD ubicacion NVARCHAR(100)")
except:
    pass

conn.commit()
print("Columns added successfully.")
conn.close()
