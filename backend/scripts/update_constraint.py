import pyodbc
cs = 'Driver={ODBC Driver 17 for SQL Server};Server=100.93.182.26;Database=DB_CONDOMINIOS;UID=Lily;PWD=123456789;'
conn = pyodbc.connect(cs)
c = conn.cursor()

# Eliminar restricción antigua
try:
    c.execute("ALTER TABLE incidencia DROP CONSTRAINT CK__incidenci__categ__619B8048")
except:
    pass

# Agregar nueva restricción más inclusiva
c.execute("""
    ALTER TABLE incidencia ADD CONSTRAINT CK_incidencia_categoria 
    CHECK (categoria IN ('plomeria', 'electricidad', 'limpieza', 'seguridad', 'ascensores', 'areas comunes', 'otro'))
""")

conn.commit()
print("Constraint updated successfully.")
conn.close()
