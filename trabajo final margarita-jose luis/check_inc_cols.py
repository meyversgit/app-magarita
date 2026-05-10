import pyodbc
cs = 'Driver={ODBC Driver 17 for SQL Server};Server=100.93.182.26;Database=DB_CONDOMINIOS;UID=Lily;PWD=123456789;'
conn = pyodbc.connect(cs)
c = conn.cursor()
c.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='incidencia'")
for r in c.fetchall():
    print(r[0])
conn.close()
