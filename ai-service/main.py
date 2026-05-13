import ollama
from fastapi import FastAPI
from pydantic import BaseModel
import json
import os
import re
from typing import List, Dict, Any

app = FastAPI()

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

class Shipment(BaseModel):
    product_name: str
    quantity: int
    source: str
    destination: str
    status: str

class RebalanceRequest(BaseModel):
    product_name: str
    deficit_warehouse_id: int
    inventory_context: List[Dict[str, Any]]
    constant_restock_qty: int

@app.post("/analyze")
async def analyze_shipment(shipment: Shipment):
    prompt = f"""
    Analyze the following shipment for supply chain risk:
    - Product: {shipment.product_name}
    - Quantity: {shipment.quantity}
    - Status: {shipment.status}
    - Route: {shipment.source} to {shipment.destination}
    INSTRUCTIONS:
    1. Determine risk_level (Low, Medium, High).
    2. Provide reasoning.
    3. If risk is HIGH or MEDIUM, provide an 'ai_action' (a professional email draft to the destination manager).
    4. If risk is LOW, 'ai_action' should be "No action required."
    Respond ONLY in valid JSON format with these exact keys:
    "risk_level", "reasoning", "ai_action"

    The 'ai_action' value must be a single-line string. Use \\n for line breaks, NOT actual newlines.
    """

    response = client.chat(model='llama3', messages=[
        {'role': 'user', 'content': prompt}
    ])

    content = response['message']['content']
    
    try:
        start = content.find('{')
        end = content.rfind('}') + 1
        json_str = content[start:end]
        json_str = fix_json_strings(json_str)
        return json.loads(json_str)
    except Exception as e:
        print(f"FAILED TO PARSE AI RESPONSE: {content}")
        return {
            "risk_level": "Medium", 
            "reasoning": f"AI Parsing Error: {str(e)}", 
            "ai_action": "Manual review required."
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