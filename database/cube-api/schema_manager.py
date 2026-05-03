import uvicorn
from fastapi import FastAPI, Body
import os
import requests

app = FastAPI()

# Путь внутри контейнера, куда Cube смотрит схемы
MODEL_PATH = "/cube/conf/model"
CUBE_RELOAD_URL = "http://localhost:4000/cubejs-system/v1/reload"
CUBE_SECRET = os.environ.get("CUBEJS_API_SECRET", "asapbi_secret_key_999")

@app.post("/update_schema")
async def update_schema(name: str = Body(...), code: str = Body(...)):
    try:
        if not os.path.exists(MODEL_PATH):
            os.makedirs(MODEL_PATH)
        
        file_path = os.path.join(MODEL_PATH, f"{name}.js")
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(code)
        
        # Пытаемся уведомить Cube (игнорируем ошибки, если он еще не проснулся)
        try:
            requests.get(CUBE_RELOAD_URL, headers={"Authorization": CUBE_SECRET}, timeout=2)
        except:
            pass
            
        return {"status": "ok", "file": file_name}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
