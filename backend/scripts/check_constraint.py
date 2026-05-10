import pyodbc
cs = 'Driver={ODBC Driver 17 for SQL Server};Server=100.93.182.26;Database=DB_CONDOMINIOS;UID=Lily;PWD=123456789;'
conn = pyodbc.connect(cs)
c = conn.cursor()
c.execute("SELECT definition FROM sys.check_constraints WHERE name = 'CK__incidenci__categ__619B8048'")
print(c.fetchone()[0])
conn.close()
