from fastapi import APIRouter, File, UploadFile
import tempfile, subprocess, os
from pydantic import BaseModel

router = APIRouter()


class CodeRequest(BaseModel):
    # filename: str
    code: str


@router.post("/run")
async def run_cpp(req: CodeRequest):
    with tempfile.TemporaryDirectory() as tmpdir:
        filepath = os.path.join(tmpdir, "main.cpp")
        with open(filepath, "w") as f:
            f.write(req.code)

        exe_path = os.path.join(tmpdir, "program")

        compile_cmd = ["g++", "-std=c++17", filepath, "-o", exe_path]
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
