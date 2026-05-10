import pyodbc
cs = 'Driver={ODBC Driver 17 for SQL Server};Server=100.93.182.26;Database=DB_CONDOMINIOS;UID=Lily;PWD=123456789;'
conn = pyodbc.connect(cs)
c = conn.cursor()

# Buscar usuarios residentes sin perfil de residente
c.execute("""
    SELECT u.id 
    FROM usuario u
    LEFT JOIN residente r ON u.id = r.usuario_id
    WHERE u.rol = 'residente' AND r.id IS NULL
""")
orphans = [row[0] for row in c.fetchall()]

if orphans:
    print(f"Found {len(orphans)} users without resident profiles. Fixing...")
    c.execute("SELECT TOP 1 id FROM apartamento")
    apto_id = c.fetchone()[0]
    
    for uid in orphans:
        c.execute("INSERT INTO residente (usuario_id, apartamento_id, fecha_ingreso, propietario) VALUES (?, ?, GETDATE(), 0)", (uid, apto_id))
    
    conn.commit()
    print("All profiles created.")
else:
    print("No orphan users found.")

conn.close()
