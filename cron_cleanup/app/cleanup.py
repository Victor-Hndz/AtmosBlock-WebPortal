from db import get_db_connection
from minio_client import delete_file
import os

def cleanup_expired_files():
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute("SELECT id, files FROM generated_files WHERE expires_at < NOW()")
    expired_entries = cur.fetchall()

    for id_, files in expired_entries:
        for file_key in files:
            print(f"Deleting {file_key}...")
            delete_file(os.getenv("MINIO_BUCKET"), file_key)

        cur.execute("DELETE FROM generated_files WHERE id = %s", (id_,))

    conn.commit()
    cur.close()
    conn.close()
