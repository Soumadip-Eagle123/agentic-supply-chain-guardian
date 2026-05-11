import ollama
from fastapi import FastAPI
from pydantic import BaseModel
import json
import os
import re

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
     #   json_str = json_str.replace('\n', '\\n').replace('\r', '\\r')
        json_str = fix_json_strings(json_str)
        return json.loads(json_str)
    except Exception as e:
        print(f"FAILED TO PARSE AI RESPONSE: {content}")
        return {
            "risk_level": "Medium", 
            "reasoning": f"AI Parsing Error: {str(e)}", 
            "ai_action": "Manual review required."
        }