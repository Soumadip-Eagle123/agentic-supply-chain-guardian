import os
import json
import uuid
import shutil
import ollama
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

from rag_engine import rag_engine

load_dotenv()

# Point to host machine Ollama daemon
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://host.docker.internal:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:1.5b")

# No timeout set: Let the model take as much time as needed
client = ollama.Client(host=OLLAMA_HOST)

@asynccontextmanager
async def lifespan(app: FastAPI):
    default_pdf_path = "/app/data/defaults/global_SOP.pdf"
    if os.path.exists(default_pdf_path):
        print(f"[BOOT]: Seeding RAG manual...")
        try:
            chunks_indexed = rag_engine.process_and_index_pdf(
                file_path=default_pdf_path,
                collection_name="supply_chain_defaults",
                origin_name="global_SOP.pdf"
            )
            print(f"[BOOT]: Indexed {chunks_indexed} SOP chunks.")
        except Exception as e:
            print(f"[BOOT ERROR]: {e}")
    yield

class EnvironmentMetadata(BaseModel):
    route_id: Optional[str] = "Unknown-Corridor"
    road_condition: Optional[str] = "Standard-Paved"
    current_weather: Optional[str] = "Clear"

class Shipment(BaseModel):
    product_name: str
    quantity: int
    source: str
    destination: str
    status: str
    userID: Optional[str] = None
    metadata_env: Optional[EnvironmentMetadata] = None

class RebalanceRequest(BaseModel):
    product_name: str
    deficit_warehouse_id: int
    inventory_context: List[Dict[str, Any]]
    constant_restock_qty: int

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def fix_json_strings(s: str) -> str:
    result = []
    in_string = False
    escape_next = False
    for char in s:
        if escape_next:
            result.append(char)
            escape_next = False
        elif char == '\\':
            result.append(char)
            escape_next = True
        elif char == '"':
            result.append(char)
            in_string = not in_string
        elif in_string and char == '\n':
            result.append('\\n')
        elif in_string and char == '\r':
            result.append('\\r')
        else:
            result.append(char)
    return ''.join(result)

@app.post("/analyze")
async def analyze_shipment(shipment: Shipment):
    env = shipment.metadata_env or EnvironmentMetadata()

    search_query = f"Safety rules for shipping {shipment.product_name} in {env.current_weather}"
    rag_context = rag_engine.fetch_combined_context(
        search_query=search_query,
        user_id=shipment.userID
    )

    prompt = f"""
SYSTEM: You are the Autonomous Supply Chain Guardian routing terminal.
Analyze logistics telemetry and respond ONLY in valid JSON format.

OPERATIONAL SOP:
{rag_context if rag_context else "Standard precautions apply."}

CORRIDOR TELEMETRY:
- Asset: {shipment.product_name} ({shipment.quantity} units)
- Route: {env.route_id}
- Surface: {env.road_condition}
- Weather: {env.current_weather}
- Status: {shipment.status}

RULES:
1. Determine risk_level: "Low", "Medium", or "High".
2. Provide concise reasoning citing regulations where applicable.
3. If risk is High/Medium, provide an 'ai_action' draft to destination manager. Otherwise 'No action required.'

OUTPUT STRICT JSON ONLY:
{{
    "risk_level": "Low" | "Medium" | "High",
    "reasoning": "Brief explanation",
    "ai_action": "Single line action"
}}
"""
    response = client.chat(
        model=OLLAMA_MODEL,
        messages=[{'role': 'user', 'content': prompt}],
        options={
            'temperature': 0.1
        }
    )
    content = response['message']['content']
    start = content.find('{')
    end = content.rfind('}') + 1
    return json.loads(fix_json_strings(content[start:end]))

@app.post("/rebalance")
async def analyze_rebalance(data: RebalanceRequest):
    inventory_summary = json.dumps(data.inventory_context, indent=2)

    prompt = f"""
SYSTEM: Autonomous Supply Chain Guardian.
TASK: Choose source warehouse to restock {data.product_name} by {data.constant_restock_qty} units for Deficit Hub {data.deficit_warehouse_id}.

DATA:
{inventory_summary}

RULES:
1. Source must have (Stock - {data.constant_restock_qty}) > min_threshold.
2. Select hub with largest surplus. If none qualify, status = "INSUFFICIENT".

OUTPUT STRICT JSON ONLY:
{{
    "status": "EXECUTE" | "INSUFFICIENT",
    "source_id": 1,
    "qty": {data.constant_restock_qty},
    "reasoning": "Explanation"
}}
"""
    response = client.chat(
        model=OLLAMA_MODEL,
        messages=[{'role': 'user', 'content': prompt}],
        options={
            'temperature': 0.1
        }
    )
    content = response['message']['content']
    start = content.find('{')
    end = content.rfind('}') + 1
    return json.loads(fix_json_strings(content[start:end]))