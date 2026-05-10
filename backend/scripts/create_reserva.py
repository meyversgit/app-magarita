import pyodbc
cs = 'Driver={ODBC Driver 17 for SQL Server};Server=100.93.182.26;Database=DB_CONDOMINIOS;UID=Lily;PWD=123456789;'
conn = pyodbc.connect(cs)
c = conn.cursor()
sql = """
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[reserva]') AND type in (N'U'))
BEGIN
    CREATE TABLE reserva (
        id INT IDENTITY(1,1) PRIMARY KEY,
        residente_id INT FOREIGN KEY REFERENCES residente(id),
        area_comun VARCHAR(100),
        fecha_reserva DATE,
        hora_inicio TIME,
        estado VARCHAR(20) DEFAULT 'pendiente',
        fecha_creacion DATETIME DEFAULT GETDATE()
    )
END
"""
c.execute(sql)
conn.commit()
print("Reserva table ready")
conn.close()
