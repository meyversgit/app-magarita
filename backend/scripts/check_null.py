import pyodbc
cs = 'Driver={ODBC Driver 17 for SQL Server};Server=100.93.182.26;Database=DB_CONDOMINIOS;UID=Lily;PWD=123456789;'
conn = pyodbc.connect(cs)
c = conn.cursor()
c.execute("SELECT IS_NULLABLE, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='residente'")
for r in c.fetchall():
    print(f"{r[1]}: {r[0]}")
conn.close()
