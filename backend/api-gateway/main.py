from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"mensaje": "API Gateway de HouseFound funcionando correctamente"}