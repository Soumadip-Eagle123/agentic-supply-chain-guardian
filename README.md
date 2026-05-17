# 🛡️ Agentic Supply Chain Guardian (Local Setup Guide)

Welcome to the **Agentic Supply Chain Guardian** — a professional-grade, autonomous logistics command center.

This system transforms traditional supply chain management from reactive, rules-based tracking into a state-aware, proactive orchestration platform powered by local Generative AI reasoning.

The entire stack is containerized using Docker and uses decentralized local microservices to handle:

- Persistent database operations
- Machine learning workflows
- AI-driven operational analysis
- Real-time user interfaces

---

# 🏗️ Core Architecture Matrix

The workspace is divided into three independent, decoupled tiers:

## 1. The Face (`agentic-frontend/`)

A full-stack Next.js App Router portal featuring:

- Tailwind CSS styling
- Cyberpunk matrix-inspired UI
- Leaflet.js interactive maps
- Authentication-aware layouts
- Real-time logistics dashboards

---

## 2. The Controller (`/`)

A Node.js + Express gateway responsible for:

- Authorization middleware
- Session handling
- Cookie verification
- API routing
- Shipment orchestration
- Database mutations
- Communication between services

---

## 3. The Brain (`ai-service/`)

A Python/FastAPI microservice responsible for:

- Semantic chunk parsing
- Vector embeddings
- ChromaDB indexing
- LLM reasoning
- AI workflow generation
- Operational anomaly detection

---

# 🛠️ Local System Prerequisites

Ensure your machine has the following tools installed before setup:

| Requirement | Recommended Version |
|---|---|
| Operating System | Linux (Ubuntu / Pop!_OS preferred) |
| Docker | Latest Stable |
| Docker Compose | V2 Plugin |
| Node.js | v20+ |
| Python | v3.10 – v3.12 |
| Git | Latest Stable |

---

# ⚙️ Phase 1: Environment Variables Configuration

Create separate environment configuration files for each service.

---

## 1. Root Backend Configuration (`/.env`)

Create a `.env` file in the root directory beside `server.js`.

```env
PORT=8000
NODE_ENV=development

SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-service-role-or-anon-key

SESSION_SECRET=jellyfish-baskingshark

AI_SERVICE_URL=http://ai-service:8000
```

---

## 2. Frontend Configuration (`agentic-frontend/.env.local`)

Create a `.env.local` file inside the `agentic-frontend/` directory.

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 3. AI Microservice Configuration (`ai-service/.env`)

Create a `.env` file inside the `ai-service/` directory.

```env
GROQ_API_KEY=gsk_your_actual_groq_cloud_api_key
```

---

# 🧠 Phase 2: Setting Up Local AI Reasoning

You have two deployment options.

---

## Option A — Hosted Enterprise Brain (Recommended)

Use a cloud-hosted LLM provider via the `GROQ_API_KEY`.

Advantages:

- No heavy downloads
- Faster setup
- Lower local resource usage
- Simpler maintenance

If you use this option, Phase 2 setup is complete.

---

## Option B — Sovereign Offline Infrastructure

Run the reasoning engine entirely offline using Ollama.

---

### Step 1 — Install Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

---

### Step 2 — Download Llama 3

```bash
ollama run llama3
```

This downloads approximately 4–5 GB of model weights.

---

### Step 3 — Expose Ollama to Docker Containers

Create the override directory:

```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
```

Create the override configuration:

```bash
echo -e "[Service]\nEnvironment=\"OLLAMA_HOST=0.0.0.0\"" | sudo tee /etc/systemd/system/ollama.service.d/override.conf
```

Reload and restart Ollama:

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

---

# 🚀 Phase 3: Building and Launching the Stack

## Step 1 — Fix Local Permissions

```bash
sudo chmod -R 777 ./ai-service/data
```

## Step 2 — Build Containers

```bash
docker compose up --build
```

## Step 3 — Verify Service Startup Logs

Expected logs:

```bash
ai-service-1 | Uvicorn running on http://0.0.0.0:8000

app-1        | Server running at http://localhost:8000
```

## Step 4 — Open the Frontend

Navigate to:

```text
http://localhost:3000
```

---

# 🧪 Phase 4: Instant Feature-Testing Data

To quickly see the multi-tier agent layout reason and adjust metrics, sign up as a user on the screen, lock coordinates using the Leaflet map container, and test these scenarios using Postman or the Dispatch UI.

---

# 📉 1. Perishable Ingestion & Email Mitigation Test

## Input Data

| Field | Value |
|---|---|
| Product Name | Perishable Vaccines |
| Quantity | 160 |
| Status | Delayed |

---

## Expected AI Trace

The AI registers the vulnerable category **Vaccines** from the embedded vector context baseline sheets.

The system immediately:

- Bypasses standard low-quantity heuristics
- Marks the shipment route as **High Risk**
- Detects temperature-sensitive inventory behavior
- Generates a mitigation workflow
- Dynamically appends an escaped-string operational email proposal inside the `ai_action` column
- Requests auxiliary cooling support lines automatically

---

# 🚨 2. Hazard Compliance Directive Breach

## Input Data

| Field | Value |
|---|---|
| Product Name | Lithium Ion |
| Quantity | 50 |
| Status | Delayed |

---

## Context Scenario

Submit this shipment route while regional ambient sensor telemetry reflects environmental temperatures exceeding:

```text
30°C

---

# ✅ Final Notes

The Agentic Supply Chain Guardian is designed as a modular, enterprise-grade AI orchestration platform.