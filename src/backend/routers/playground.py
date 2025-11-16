from fastapi import APIRouter
from typing import Dict
import tempfile
import subprocess
import os
from pydantic import BaseModel

router = APIRouter()


class CodeFiles(BaseModel):
    code: Dict[str, str]


def compile_and_run(
    code: Dict[str, str],
    compile_errors: list[str] = [],
):
    files = code
    output = {}
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
            problem_file_name = (
                compile_result.stderr.split(tmpdir)[-1].split(":")[0].strip("/")
            )
            with open(f"../../examples/{problem_file_name}") as problem_file:
                code[problem_file_name] = problem_file.read()
            compile_errors.append(
                {"file": problem_file_name, "error": compile_result.stderr}
            )
            output = compile_and_run(code, compile_errors)
            return output

        output["compile_errors"] = compile_errors
        if len(compile_errors) == len(code):
            return output
        run_result = subprocess.run([exe_path], capture_output=True, text=True)
        if run_result.returncode != 0:
            compile_errors.append(run_result.stderr)

        output["runtime_output"] = run_result.stdout
        return output


@router.post("/run")
async def run_cpp(code: Dict[str, str]):
    output = compile_and_run(code, [])
    print(output)
    return output


@router.get("/files")
async def get_files():
    file_names = os.listdir("../../examples")

    files = {}
    for file_name in file_names:
        if "pp" in file_name:
            with open(f"../../examples/{file_name}") as file:
                files[f"{file_name}"] = file.read()
    return files
