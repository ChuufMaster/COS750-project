from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import playground, quiz, uml
from fastapi.staticfiles import StaticFiles


app = FastAPI()

origins = [
    "http://localhost:5173",  # your frontend URL
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # or ["*"] to allow all
    allow_credentials=True,
    allow_methods=["*"],  # GET, POST, etc.
    allow_headers=["*"],
)

app.include_router(playground.router, prefix="/playground")
app.include_router(quiz.router, prefix="/quiz")
app.include_router(uml.router, prefix="/uml")

app.mount("/static", StaticFiles(directory="../../examples"), name="static")


@app.get("/")
async def root():
    return {"message": "Hello World"}
