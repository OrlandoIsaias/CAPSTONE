from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"mensaje": "Mascotas Service de HouseFound funcionando correctamente"}