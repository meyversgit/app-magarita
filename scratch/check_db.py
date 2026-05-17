import pyodbc

CONNECTION_STRING = (
    "Driver={ODBC Driver 17 for SQL Server};"
    "Server=100.93.182.26;"
    "Database=DB_CONDOMINIOS;"
    "UID=Lily;PWD=123456789;"
)

def main():
    conn = pyodbc.connect(CONNECTION_STRING)
    cursor = conn.cursor()
    
    # Check if we have an antigravity user
    cursor.execute("SELECT id, nombre, email FROM usuario WHERE nombre='antigravity' OR email LIKE '%antigravity%'")
    users = cursor.fetchall()
    print("Users found:", users)
    
    for u in users:
        print(f"Deleting user {u.id}")
        # Need to delete dependent records first
        cursor.execute("SELECT id FROM residente WHERE usuario_id=?", (u.id,))
        res_rows = cursor.fetchall()
        for r in res_rows:
            cursor.execute("DELETE FROM pago WHERE residente_id=?", (r.id,))
            cursor.execute("DELETE FROM incidencia WHERE residente_id=?", (r.id,))
            cursor.execute("DELETE FROM reserva WHERE residente_id=?", (r.id,))
        cursor.execute("DELETE FROM residente WHERE usuario_id=?", (u.id,))
        cursor.execute("DELETE FROM notificacion WHERE usuario_id=?", (u.id,))
        cursor.execute("DELETE FROM usuario WHERE id=?", (u.id,))
    
    conn.commit()
    print("Deleted antigravity users.")
    
    # Check if apartamento_id in residente allows NULL
    cursor.execute("""
        SELECT COLUMN_NAME, IS_NULLABLE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'residente' AND COLUMN_NAME = 'apartamento_id'
    """)
    col = cursor.fetchone()
    print("Apartamento ID nullable:", col)
    
    if col and col[1] == 'NO':
        print("Making apartamento_id nullable...")
        cursor.execute("ALTER TABLE residente ALTER COLUMN apartamento_id INT NULL")
        conn.commit()
        print("Made nullable.")
        
    conn.close()

if __name__ == "__main__":
    main()
