from minio import Minio
import os

client = Minio(
    os.getenv("MINIO_ENDPOINT"),
    access_key=os.getenv("MINIO_USER"),
    secret_key=os.getenv("MINIO_PASSWORD"),
    secure=False,
)

def delete_file(bucket: str, object_name: str):
    client.remove_object(bucket, object_name)
