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

from rag_engine import rag_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Executes on service container start to check for baseline system documents."""
    default_pdf_path = "/app/data/defaults/global_SOP.pdf"
    if os.path.exists(default_pdf_path):
        print(f"[BOOT]: Baseline corporate handbook detected at: {default_pdf_path}. Generating embedding vectors...")
        try:
            chunks_indexed = rag_engine.process_and_index_pdf(
                file_path=default_pdf_path, 
                collection_name="supply_chain_defaults", 
                origin_name="global_SOP.pdf"
            )
            print(f"[BOOT]: Global baseline data indexed successfully. Cached {chunks_indexed} default chunks.")
        except Exception as e:
            print(f"[BOOT ERROR]: Critical exception occurred while seeding defaults collection: {e}")
    else:
        print("[BOOT WARN]: Missing file at /app/data/defaults/global_SOP.pdf. Skipping automatic system seeding.")
    
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
    metadata_env: Optional[EnvironmentMetadata] = None  # Single unified schema track

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

def fix_json_strings(s):
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

client = ollama.Client(host='http://host.docker.internal:11434')

@app.post("/upload-kb")
async def upload_custom_user_intelligence(
    file: UploadFile = File(...),
    userID: str = Form(...)
):
    """Processes incoming custom operational safety PDFs and saves vectors into an isolated user silo."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Invalid file type extension. Only PDFs are supported.")

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

        return {"status": "SUCCESS", "chunks": total_chunks, "target_silo": collection_target}
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Ingestion process crash error: {str(error)}")
    finally:
        if os.path.exists(target_path):
            os.remove(target_path)

@app.post("/analyze")
async def analyze_shipment(shipment: Shipment):
    try:
        env = shipment.metadata_env or EnvironmentMetadata()
        
        search_query = (
            f"Safety regulations and transport constraints for shipping {shipment.product_name} "
            f"via route {env.route_id} under road condition: {env.road_condition} "
            f"and meteorological weather state: {env.current_weather}"
        )

        rag_context = rag_engine.fetch_combined_context(
            search_query=search_query, 
            user_id=shipment.userID
        )
        print(f"\n--- [DEBUG RAG CONTEXT FOR: {shipment.product_name}] ---\n{rag_context}\n---------------------------------------\n")

        prompt = f"""
        SYSTEM: You are the Autonomous Supply Chain Guardian routing terminal intelligence.
        Evaluate transit parameters using the provided standard operating document rules.
        
        VERIFIED LOGISTICS MANUAL DIRECTIVES:
        {rag_context if rag_context else "No specialized constraints recorded for these parameters."}

        LIVE SHIPMENT CORRIDOR TELEMETRY:
        - Product Asset: {shipment.product_name}
        - Quantity: {shipment.quantity}
        - Current Route Corridor: {env.route_id}
        - Surface Integrity Track: {env.road_condition}
        - Weather Pattern: {env.current_weather}
        - Pipeline Status: {shipment.status}

        INSTRUCTIONS:
        1. Determine risk_level (Low, Medium, High).
        2. Provide reasoning citing context restrictions where applicable.
        3. If risk is HIGH or MEDIUM, provide an 'ai_action' (a professional email draft to the destination manager).
        4. If risk is LOW, 'ai_action' should be "No action required."

        Respond ONLY in valid JSON format with these exact keys:
        "risk_level", "reasoning", "ai_action"
        
        The 'ai_action' value must be a single-line string. Use \\n for line breaks.
        """

        response = client.chat(model='llama3', messages=[{'role': 'user', 'content': prompt}])
        content = response['message']['content']
        
        start = content.find('{')
        end = content.rfind('}') + 1
        json_str = fix_json_strings(content[start:end])
        return json.loads(json_str)

    except Exception as e:
        print(f"[ANALYZE CRASH ERROR]: {str(e)}")
        return {
            "risk_level": "Medium",
            "reasoning": f"Advanced RAG processing fault: {str(e)}",
            "ai_action": "Manual dispatch review required immediately."
        }

@app.post("/rebalance")
async def analyze_rebalance(data: RebalanceRequest):
    inventory_summary = json.dumps(data.inventory_context, indent=2)

    prompt = f"""
    SYSTEM: You are the Autonomous Supply Chain Guardian.
    TASK: Find a source warehouse to restock {data.product_name}.
    REQUIRED: {data.constant_restock_qty} units.
    DEFICIT HUB ID: {data.deficit_warehouse_id}.

    INVENTORY DATA:
    {inventory_summary}

    RULES:
    1. Source warehouse must have (Current Stock - {data.constant_restock_qty}) > its own min_threshold.
    2. Choose the hub with the LARGEST surplus.
    3. If no hub qualifies, set "status" to "INSUFFICIENT".

    RESPONSE FORMAT (JSON ONLY):
    {{
        "status": "EXECUTE" | "INSUFFICIENT",
        "source_id": int,
        "qty": int,
        "reasoning": "Single line explanation"
    }}
    """

    try:
        response = client.chat(model='llama3', messages=[{'role': 'user', 'content': prompt}])
        content = response['message']['content']

        start = content.find('{')
        end = content.rfind('}') + 1
        json_str = content[start:end]
        json_str = fix_json_strings(json_str)
        return json.loads(json_str)
    except Exception as e:
        print(f"REBALANCE_AI_FAULT: {str(e)}")
        return {"status": "INSUFFICIENT", "source_id": None, "qty": 0, "reasoning": "AI logic error."}