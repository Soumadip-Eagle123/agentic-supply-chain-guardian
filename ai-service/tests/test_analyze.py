import sys
import os
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

# Ensure ai-service root is importable when running pytest from tests/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, extract_and_parse_json, AnalysisResult

client = TestClient(app)


# ── Unit tests for extract_and_parse_json ──────────────────────────────────

def test_extract_plain_json():
    raw = '{"risk_level": "Low", "reasoning": "ok", "ai_action": "None", "estimated_delay_hours": 0.0, "dynamic_eta": "On schedule"}'
    result = extract_and_parse_json(raw)
    assert result["risk_level"] == "Low"
    assert result["estimated_delay_hours"] == 0.0


def test_extract_json_with_markdown_fences():
    raw = '```json\n{"risk_level": "High", "reasoning": "flood", "ai_action": "Reroute", "estimated_delay_hours": 4.5, "dynamic_eta": "+4.5 hrs"}\n```'
    result = extract_and_parse_json(raw)
    assert result["risk_level"] == "High"
    assert result["dynamic_eta"] == "+4.5 hrs"


def test_extract_json_with_think_tags():
    raw = '<think>reasoning about roads...</think>{"risk_level": "Medium", "reasoning": "x", "ai_action": "y", "estimated_delay_hours": 2.0, "dynamic_eta": "+2 hrs"}'
    result = extract_and_parse_json(raw)
    assert result["risk_level"] == "Medium"


def test_extract_raises_on_no_json():
    with pytest.raises(ValueError):
        extract_and_parse_json("no json here at all")


# ── Integration tests for /analyze, with Groq mocked ────────────────────────

def _mock_groq_response(json_str: str):
    """Builds a fake Groq response object matching response.choices[0].message.content"""
    mock_message = MagicMock()
    mock_message.content = json_str
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]
    return mock_response


@patch("main.rag_engine.fetch_combined_context", return_value="")
@patch("main.groq_client.chat.completions.create")
def test_analyze_returns_valid_shape(mock_groq, mock_rag):
    mock_groq.return_value = _mock_groq_response(
        '{"risk_level": "High", "reasoning": "Potholes reported near destination", '
        '"ai_action": "Reroute via NH-2", "estimated_delay_hours": 3.5, '
        '"dynamic_eta": "+3.5 hrs (Road Damage Detour)"}'
    )

    payload = {
        "product_name": "Lithium Ion",
        "quantity": 50,
        "source": "Warehouse A",
        "destination": "Kanpur",
        "status": "Delayed",
    }

    response = client.post("/analyze", json=payload)

    assert response.status_code == 200
    data = response.json()

    # Confirms every field from AnalysisResult is present and correctly typed
    assert data["risk_level"] in ("High", "Medium", "Low")
    assert isinstance(data["estimated_delay_hours"], float)
    assert isinstance(data["dynamic_eta"], str)
    assert data["estimated_delay_hours"] == 3.5
    assert "Detour" in data["dynamic_eta"]


@patch("main.rag_engine.fetch_combined_context", return_value="")
@patch("main.groq_client.chat.completions.create")
def test_analyze_low_risk_zero_delay(mock_groq, mock_rag):
    mock_groq.return_value = _mock_groq_response(
        '{"risk_level": "Low", "reasoning": "No disruptions found", '
        '"ai_action": "No action required.", "estimated_delay_hours": 0.0, '
        '"dynamic_eta": "On schedule"}'
    )

    payload = {
        "product_name": "Office Supplies",
        "quantity": 10,
        "source": "Warehouse B",
        "destination": "Chennai",
        "status": "In Transit",
    }

    response = client.post("/analyze", json=payload)
    data = response.json()

    assert data["risk_level"] == "Low"
    assert data["estimated_delay_hours"] == 0.0
    assert data["dynamic_eta"] == "On schedule"


@patch("main.rag_engine.fetch_combined_context", return_value="")
@patch("main.groq_client.chat.completions.create")
def test_analyze_returns_500_on_malformed_llm_output(mock_groq, mock_rag):
    # Missing required fields (estimated_delay_hours, dynamic_eta) —
    # this should fail Pydantic validation and surface as a 500, not pass silently.
    mock_groq.return_value = _mock_groq_response(
        '{"risk_level": "High", "reasoning": "x", "ai_action": "y"}'
    )

    payload = {
        "product_name": "Test",
        "quantity": 1,
        "source": "A",
        "destination": "B",
        "status": "Delayed",
    }

    response = client.post("/analyze", json=payload)
    assert response.status_code == 500