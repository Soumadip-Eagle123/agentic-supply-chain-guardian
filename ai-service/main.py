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

    Respond ONLY in JSON format with exactly two keys:
    "risk_level": (Choose one: Low, Medium, High)
    "reasoning": (Briefly explain why)
    """

    # Use the client we defined above
    response = client.chat(model='llama3', messages=[
        {'role': 'user', 'content': prompt}
    ])

    try:
        return json.loads(response['message']['content'])
    except:
        return {"risk_level": "Medium", "reasoning": "AI parsing error."}