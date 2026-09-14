from fastapi import FastAPI

app = FastAPI(title="GO College API")


@app.get("/")
def root():
    return {"message": "GO College backend is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}