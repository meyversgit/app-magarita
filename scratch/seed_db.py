import pyodbc

def seed():
    try:
        conn = pyodbc.connect('Driver={ODBC Driver 17 for SQL Server};Server=100.93.182.26;Database=DB_CONDOMINIOS;UID=Lily;PWD=123456789;')
        cursor = conn.cursor()
        
        areas = [
            ('Salón Social', 50, 1),
            ('Piscina', 20, 1),
            ('Gimnasio', 8, 1),
            ('Área BBQ', 25, 1)
        ]
        
        for name, cap, disp in areas:
            cursor.execute("IF NOT EXISTS (SELECT 1 FROM area_comun WHERE nombre=?) INSERT INTO area_comun (nombre, capacidad, disponible) VALUES (?, ?, ?)", (name, name, cap, disp))
        
        conn.commit()
        print("Base de datos sembrada correctamente.")
    except Exception as e:
        print("Error al sembrar:", e)
    finally:
        if 'conn' in locals(): conn.close()

if __name__ == "__main__":
    seed()
