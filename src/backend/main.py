from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import playground, quiz, uml
from fastapi.staticfiles import StaticFiles

# New: mount the shared AI endpoints (generate/grade) for Gemini use
from routers import ai

app = FastAPI()

origins = [
    "http://localhost:5173",  # your frontend URL
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # or ["*"] to allow all
    allow_credentials=True,
    allow_methods=["*"],  # GET, POST, etc.
    allow_headers=["*"],
)

app.include_router(playground.router, prefix="/api/playground")
app.include_router(quiz.router, prefix="/api/quiz")
app.include_router(uml.router, prefix="/api/uml")
# New: AI routes shared by quiz/UML/coding playground
app.include_router(ai.router, prefix="/api/ai")


app.mount("/api/static", StaticFiles(directory="./example"), name="static")


@app.get("/")
async def root():
    return {"message": "Hello World"}
