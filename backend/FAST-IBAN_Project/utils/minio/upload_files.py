import os
from minio import Minio
from dotenv import load_dotenv

load_dotenv()

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "minio:9000")
MINIO_USER = os.getenv("MINIO_USER", "minioadmin")
MINIO_PASSWORD = os.getenv("MINIO_PASSWORD", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "my-bucket")

minio_client = Minio(
    endpoint=MINIO_ENDPOINT,  
    access_key=MINIO_USER,             
    secret_key=MINIO_PASSWORD,
    secure=False                              
)

def upload_files_to_request_hash(request_hash: str, local_folder: str = "./out"):
    print(f"Uploading files to MinIO bucket '{MINIO_BUCKET}' under request hash '{request_hash}'...")
    if not minio_client.bucket_exists(MINIO_BUCKET):
        minio_client.make_bucket(MINIO_BUCKET)

    for filename in os.listdir(local_folder):
        local_path = os.path.join(local_folder, filename)
        if os.path.isfile(local_path):
            object_name = f"{request_hash}/{filename}"
            # print(f"Uploading {local_path} to {MINIO_BUCKET}/{object_name}")
            minio_client.fput_object(MINIO_BUCKET, object_name, local_path)

    print("✅ All files uploaded successfully.")

