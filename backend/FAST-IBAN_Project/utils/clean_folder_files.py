import os
import shutil

def clean_directory(path: str):
    if not os.path.isdir(path):
        raise ValueError(f"{path} is not a valid directory.")

    for entry in os.listdir(path):
        entry_path = os.path.join(path, entry)
        if os.path.isfile(entry_path) or os.path.islink(entry_path):
            os.unlink(entry_path)
        elif os.path.isdir(entry_path):
            shutil.rmtree(entry_path)
    
    # Clean up the directory itself. The format is ./out/<request_hash>/ only delete the request_hash folder
    
    if os.path.basename(path) == "out":
        for request_hash in os.listdir(path):
            request_hash_path = os.path.join(path, request_hash)
            if os.path.isdir(request_hash_path):
                shutil.rmtree(request_hash_path)
                print(f"✅ Cleaned contents of: {request_hash_path}")

    print(f"✅ Cleaned all contents of: {path}") 