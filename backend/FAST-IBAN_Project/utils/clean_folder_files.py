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

    print(f"✅ Cleaned all contents of: {path}") 