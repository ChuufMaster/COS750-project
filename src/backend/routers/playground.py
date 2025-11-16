from fastapi import APIRouter, File, UploadFile
from typing import Dict
import tempfile, subprocess, os
from pydantic import BaseModel, Json

router = APIRouter()


class CodeFiles(BaseModel):
    code: Dict[str, str]


@router.post("/run")
async def run_cpp(code: Dict[str, str]):
    files = code
    with tempfile.TemporaryDirectory() as tmpdir:
        for file_name in files:
            filepath = os.path.join(tmpdir, file_name)
            with open(filepath, "w") as f:
                f.write(files[file_name])

        exe_path = os.path.join(tmpdir, "program")
        cpp_files = [
            os.path.join(tmpdir, name) for name in files if name.endswith(".cpp")
        ]
        compile_cmd = ["g++", "-std=c++17", "-I", ".", "-o", exe_path] + cpp_files
        compile_result = subprocess.run(compile_cmd, capture_output=True, text=True)
        if compile_result.returncode != 0:
            return {"compile_errors": compile_result.stderr}

        run_result = subprocess.run([exe_path], capture_output=True, text=True)
        if run_result.returncode != 0:
            return {"compile_errors": run_result.stderr}

        return {
            "runtime_output": run_result.stdout,
            "compile_errors": compile_result.stderr,
        }


@router.get("/files")
async def get_files():
    file_names = os.listdir("../../examples")

    files = {}
    for file_name in file_names:
        if "pp" in file_name:
            with open(f"../../examples/{file_name}") as file:
                files[f"{file_name}"] = file.read()
    return files
