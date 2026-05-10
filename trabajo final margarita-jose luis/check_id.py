import pyodbc
cs = 'Driver={ODBC Driver 17 for SQL Server};Server=100.93.182.26;Database=DB_CONDOMINIOS;UID=Lily;PWD=123456789;'
conn = pyodbc.connect(cs)
c = conn.cursor()
c.execute("SELECT COLUMN_NAME, COLUMNPROPERTY(OBJECT_ID('usuario'), COLUMN_NAME, 'IsIdentity') FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='usuario'")
for r in c.fetchall():
    print(f"{r[0]}: {r[1]}")
conn.close()
