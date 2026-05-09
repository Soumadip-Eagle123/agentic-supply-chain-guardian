import ollama
from fastapi import FastAPI
from pydantic import BaseModel
import json
import os

app = FastAPI()

# Point to the host machine where Ollama is actually running
client = ollama.Client(host='http://host.docker.internal:11434')

class Shipment(BaseModel):
    product_name: str
    quantity: int
    source: str
    destination: str
    status: str

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
    """

    response = client.chat(model='llama3', messages=[
        {'role': 'user', 'content': prompt}
    ])

    content = response['message']['content']
    
    try:
        start = content.find('{')
        end = content.rfind('}') + 1
        json_str = content[start:end]
        
        return json.loads(json_str)
    except Exception as e:
        print(f"FAILED TO PARSE AI RESPONSE: {content}")
        return {
            "risk_level": "Medium", 
            "reasoning": f"AI Parsing Error: {str(e)}", 
            "ai_action": "Manual review required."
        }