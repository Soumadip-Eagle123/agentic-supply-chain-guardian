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
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")

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
    sourceID: Optional[str] = None
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

    # Search for both route conditions and asset rules
    search_query = f"{shipment.destination} road infrastructure condition potholes damage {shipment.product_name} transit rules"
    
    # Retrieve top 5 chunks to get past cover pages/citations
    rag_context = rag_engine.fetch_combined_context(
        search_query=search_query,
        user_id=shipment.userID,
        top_k=5
    )

    print("\n" + "="*50)
    print(f"[RAG ENGINE] Target Asset: {shipment.product_name}")
    print(f"[RAG ENGINE] Destination: {shipment.destination}")
    print(f"[RAG ENGINE] Retrieved Context:\n{rag_context if rag_context else '<< NO RELEVANT CHUNKS FOUND >>'}")
    print("="*50 + "\n")

    prompt = f"""
SYSTEM: You are the Autonomous Supply Chain Guardian routing intelligence.
Analyze shipment telemetry strictly following the provided operational briefings.

OPERATIONAL BRIEFINGS & CORRIDOR MANUALS:
{rag_context if rag_context else "Standard precautions apply."}

LIVE TELEMETRY:
- Asset: {shipment.product_name} ({shipment.quantity} units)
- Corridor: {shipment.source} -> {shipment.destination}
- Route: {env.route_id}
- Surface Condition: {env.road_condition}
- Weather: {env.current_weather}
- Pipeline Status: {shipment.status}

RULES:
1. Review the Corridor Manuals. If road damage, dilapidated pavements, potholes, or construction are reported along the route or at the destination (e.g. Kanpur/Panki), assign "High" or "Medium" risk regardless of whether the product is hazardous.
2. If asset is Hazardous (Explosives, Batteries, Chemicals, Acid), assign "High" risk.
3. In 'reasoning', cite the specific road conditions or hazards found in the briefing.
4. If risk is High or Medium, 'ai_action' MUST provide an actionable mitigation directive to the receiver/driver. If risk is Low, set 'ai_action' to "No action required."

OUTPUT STRICT JSON ONLY:
{{
    "risk_level": "High" | "Medium" | "Low",
    "reasoning": "Brief explanation citing specific corridor and asset conditions",
    "ai_action": "Actionable directive"
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

@app.post("/upload-kb")
async def upload_custom_user_intelligence(
    file: UploadFile = File(...),
    userID: str = Form(...)
):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDFs are supported.")

    temp_dir = "/app/data/temp"
    os.makedirs(temp_dir, exist_ok=True)
    target_path = os.path.join(temp_dir, f"{uuid.uuid4().hex[:6]}_{file.filename}")

    try:
        with open(target_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        collection_target = f"user_kb_collection_{userID}"
        total_chunks = rag_engine.process_and_index_pdf(
            file_path=target_path,
            collection_name=collection_target,
            origin_name=file.filename
        )

        return {
            "status": "SUCCESS",
            "chunks": total_chunks,
            "target_silo": collection_target
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(error)}")
    finally:
        if os.path.exists(target_path):
            os.remove(target_path)