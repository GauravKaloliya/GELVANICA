# Gnovium AI Platform & Multi-Agent System Architecture

Qwen2.5-3B-Instruct Fine-Tuning + Electron Desktop + Cloud API + Multi-Agent System  
(Local-First + Network-Aware Design)

## 1. Executive Summary

This architecture covers fine-tuning Qwen2.5-3B-Instruct on Gnovium's data, deploying it on both Electron desktop and cloud APIs, and integrating with a practical multi-agent system for workspace intelligence.

- **Default:** Fully local, offline, on-device (Q4_K_M GGUF)
- **Network Mode:** Enables synchronization, collaboration, and distributed agent execution when connected
- **Same knowledge model, tools, and agent behaviors across modes**

## 2. Design Principles

- **Local-First:** All core operations work offline with full data ownership
- **Network-Aware:** Graceful upgrade to distributed capabilities when online
- **Mode Transparency:** Same APIs, agent logic, and user experience
- **Safety-First:** Explicit validation, simulation, and approval gates for agent actions
- **Agent Platform:** Runtime-agnostic, extensible multi-agent architecture

Environment Variables:
```
GNOVIUM_MODE=local (default)
GNOVIUM_MODE=cloud (network features enabled)
```

## 3. AI Platform Overview

```
AI Platform
│
├── Qwen2.5-3B-Instruct Fine-Tuning (QLoRA)
├── Evaluation
├── Quantization (GGUF)
├── Model Registry
├── Inference Runtime
├── Embedding Service (BGE-M3 Large)
│
├── Agent Platform
│   ├── Supervisor
│   ├── Planner
│   ├── Editor
│   ├── Search
│   ├── Knowledge
│   ├── Graph
│   ├── File
│   ├── Memory
│   ├── Tool Runtime
│   ├── Blackboard
│   ├── Scheduler
│   ├── Context Builder
│   ├── Prompt Builder
│   └── Safety Layer
│
├── Electron Runtime
└── Cloud Runtime
```

## 4. System Architecture & Model Specifications

| Component | Specification |
|-----------|--------------|
| **Base Model** | Qwen2.5-3B-Instruct |
| **Embedding Model** | BGE-M3 Large |
| **Dataset Storage** | SQLite + sqlite-vec (local) → pgvector (cloud) |
| **Fine-Tuning Framework** | Unsloth |
| **Method** | QLoRA (4-bit NF4) |

### Model Architecture

| Parameter | Value |
|-----------|-------|
| Model Type | Decoder-only Transformer |
| Parameters | ~3.09 Billion |
| Layers | 36 |
| Hidden Size | 2048 |
| Intermediate Size (MLP) | 11008 |
| Attention Heads | 16 |
| Key/Value Heads (GQA) | 2 |
| Head Dimension | 128 |
| Activation | SwiGLU |
| Positional Encoding | RoPE |
| Context Length | 32K (native) |
| Vocabulary Size | 151,936 |
| Attention | Grouped Query Attention |
| Normalization | RMSNorm (Pre-Norm) |
| Bias | No (most linear layers) |

**Transformer Block Pipeline** (each of 36 layers):
$$\text{Input} \rightarrow \text{RMSNorm} \rightarrow \text{Multi-Head Attention} \rightarrow \text{Residual} \rightarrow \text{RMSNorm} \rightarrow \text{SwiGLU Feed-Forward} \rightarrow \text{Residual}$$

### Training Configuration (QLoRA)

| Parameter | Value |
|-----------|-------|
| Rank (r) | 64 |
| Alpha ($\alpha$) | 128 |
| LoRA Dropout | 0.05 |
| Target Modules | q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj |
| Optimizer | AdamW (8-bit) |
| Learning Rate | 2e-4 |
| Scheduler | Cosine (3% warmup) |
| Weight Decay | 0.01 |
| Epochs | 3 (max 5) |
| Gradient Accumulation | 8 or 16 |
| Batch Size | 1–2 per device |
| Precision | BF16 |
| Quantization | 4-bit NF4 |
| Sequence Length | 8192 or 16384 |
| Gradient Checkpointing | Enabled |
| Flash Attention | Enabled |
| Packing | Enabled |

### Dataset Distribution

| # | Domain | Samples | % |
|---|--------|---------|---|
| 1 | General instruction following | 20,000 | 2.0% |
| 2 | Workspace Q&A | 90,000 | 9.0% |
| 3 | Block editing | 80,000 | 8.0% |
| 4 | Entity operations | 70,000 | 7.0% |
| 5 | Relation extraction | 120,000 | 12.0% |
| 6 | Relation classification | 60,000 | 6.0% |
| 7 | Knowledge graph reasoning | 45,000 | 4.5% |
| 8 | Semantic search (retrieval-grounded QA) | 35,000 | 3.5% |
| 9 | Hybrid retrieval reasoning | 40,000 | 4.0% |
| 10 | Workspace summarization | 50,000 | 5.0% |
| 11 | Multi-step planning | 55,000 | 5.5% |
| 12 | Tool calling | 180,000 | 18.0% |
| 13 | Agent collaboration | 20,000 | 2.0% |
| 14 | Memory usage | 25,000 | 2.5% |
| 15 | Safety & permissions | 35,000 | 3.5% |
| 16 | Versioning operations | 30,000 | 3.0% |
| 17 | AI governance | 25,000 | 2.5% |
| 18 | Gnovium domain knowledge | 20,000 | 2.0% |
| | **Total** | **1,000,000** | **100%** |

### Data Engineering Strategy

1. **Dataset Split:** Training (900k) → Validation (50k) → Test (50k held-out)
2. **Negative Examples:** Train refusal of unauthorized/impossible actions
3. **Counterexamples:** Demonstrate mistake correction (wrong JSON → correct JSON)
4. **Edge Cases:** Empty workspaces, ultra-dense files (100k blocks), cyclic graphs, invalid merges
5. **Long Context Layering:** 2K → 4K → 8K → 16K → 32K
6. **Curriculum Training:** Instruction → Q&A → Editing → Relations → Tool Calling → Planning → Agents

### Training Governance

- **Data Quality:** Deduplication, class balancing, formatting checks, label integrity
- **Execution Control:** Validate every 500 steps, checkpoint best state, early stop after 3 regressions
- **Evaluation Metrics:** Exact Match & F1, Tool Calling Accuracy & JSON Validity, Hallucination Rate, Permission Compliance, Latency & Token Efficiency

### Automated Benchmark Suite

Every training run produces a benchmark report with:

| Metric | Description |
|--------|-------------|
| JSON Validity | % of tool calls producing valid JSON |
| Tool Calling Accuracy | % of tool invocations with correct arguments |
| Relation Extraction P/R/F1 | Precision, Recall, F1 on relation extraction tasks |
| Planning Success Rate | % of multi-step plans completed without errors |
| Hallucination Rate | % of generated facts not grounded in retrieved context |
| Retrieval Grounding Accuracy | % of answers supported by retrieved documents |
| Permission Compliance | % of actions respecting user workspace permissions |
| Latency | End-to-end response time (p50/p95/p99) |
| Tokens/sec | Generation throughput |

## 5. Model Registry

```
Model Registry

├── Model Versions (Qwen2.5-3B-Instruct v1, v2, v3, ...)
├── Quantized Variants (Qwen2.5-3B-Instruct GGUF 4bit, 8bit)
├── Metadata (size, latency, benchmarks, license)
├── Rollback
├── Promotion (staging → production)
└── Deployment Targets (desktop, cloud)
```

## 6. Inference Runtime

```
Inference Runtime

├── Tokenizer (Qwen2.5)
├── Model Loader (GGUF)
├── KV Cache
├── Scheduler
├── Sampler
├── GPU Runtime
├── Streaming
├── Batch Engine
└── Speculative Decoding
```

- **Local Mode:** Q4_K_M GGUF on user device
- **Cloud Mode:** Full precision on managed GPU inference server

## 7. Embedding Service

```
BGE-M3 Large → Vector Store / Vector DB → Retrieval
```

- **Local:** BGE-M3 Large (bundled) → SQLite + sqlite-vec
- **Cloud:** BGE-M3 Large → pgvector
- Separate from LLM inference for performance and accuracy

## 8. Desktop Deployment (Electron)

```
Electron App (bundled Qwen2.5-3B-Instruct GGUF + BGE-M3 Large)
    ↓
Local Backend (Flask)
    ↓
Inference Runtime (Local GPU)
    ↓
Vector Store
```

## 9. Cloud Deployment

```
Cloud
    ↓
Load Balancer
    ↓
API Gateway
    ↓
Inference Servers (Managed GPU)
    ↓
Model Registry (Qwen2.5-3B-Instruct versions)
    ↓
Embedding Service (Dedicated Model)
    ↓
Vector DB + PostgreSQL
```

## 10. Agent Platform

### 10.1 Agent Foundation Layer

```
Application
    ↓
Agent Platform
    ↓
Supervisor | Planner | Memory | Communication | Execution | Safety | Monitoring
```

### 10.2 Agent Registry

All agents are registered with metadata so new agents can be added without changing the runtime.

```
Agent Registry

• Agent ID
• Agent Type
• Capabilities
• Tools
• Permissions
• Memory
• Version
• Status
```

### 10.3 Agent Types

#### Core
- **Supervisor Agent** — Orchestrates tasks, decides local vs cloud execution
- **Planner Agent** — Breaks down complex workspace tasks

#### Workspace
- **Editor Agent** — CRUD on blocks, pages, relations
- **Search Agent** — Full-text and semantic search across knowledge base
- **Knowledge Agent** — Graph queries, relations, properties. Validates and scores AI-suggested relations from page content, then creates approved relations via the Editor Agent with first-class provenance columns (`generated_by`, `verified`, `confidence`, `ai_model`).
- **Graph Agent** — Knowledge graph traversal and visualization
- **File Agent** — File upload, download, management

#### System
- **Memory Agent** — Manages agent memory and retrieval
- **Tool Agent** — Tool discovery, permission validation, execution

### 10.4 Agent Memory

Every agent has its own memory system:

```
Agent Memory
    ↓
Short-Term Memory (current task context)
    ↓
Long-Term Memory (persistent knowledge from past runs)
    ↓
Workspace Memory (current workspace state)
    ↓
Conversation Memory (interaction history with user)
    ↓
Shared Team Memory (cross-agent state via blackboard)
```

### 10.5 Shared Blackboard

```
Supervisor
    ↓
Blackboard (shared state)
    ↓
Planner → Workers
```

### 10.6 Message Bus

```
Message Bus
    ↓
Events (state changes, task completion)
    ↓
Commands (agent-to-agent instructions)
    ↓
Responses (results, errors)
    ↓
Streaming (real-time token output)
```

### 10.7 Agent Scheduler

```
Task Queue
    ↓
Scheduler
    ↓
Priority Queue
    ↓
Workers
```

### 10.8 Agent Lifecycle

```
Create → Initialize → Run → Pause → Resume → Terminate
```

### 10.9 Agent State Machine

Every agent has a state machine:

```
Idle → Planning → Waiting → Executing → Completed
                                          ↓
                                       Failed → Retrying
```

### 10.10 Tool Runtime

```
Tool Registry
    ↓
Discovery (find tools by capability)
    ↓
Capability Matching (match task to tool)
    ↓
Permission Check (validate agent authorization)
    ↓
Execution (run with safety gates)
```

Tool permissions:
```
Read | Write | Delete | Admin
```

### 10.11 Agent Context Builder

```
Workspace
    ↓
Context Builder (gathers entities, blocks, relations, settings)
    ↓
Agent
```

### 10.12 Agent Prompt Builder

```
Memory + Retrieved Knowledge + Task
    ↓
Prompt Builder
    ↓
LLM
```

### 10.13 Agent Execution Safety

```
LLM Output / Planner
     ↓
Policy Validator (content policies, workspace rules)
     ↓
Permission Validator (user scopes, tool permissions, branch protection)
     ↓
Simulation / Dry-Run (compute proposed changes without applying)
     ↓
Diff Generation (human-readable preview)
     ↓
Explicit User Approval (configurable auto-approve for low-risk actions)
     ↓
JSON Validator (validate LLM output is well-formed JSON)
     ↓
Schema Validator (validate JSON against expected tool schema)
     ↓
Execution via Tool Runtime
```

### 10.14 Agent Recovery

```
Failure
    ↓
Retry (automatic, configurable count)
    ↓
Fallback (alternative strategy)
    ↓
Escalate (supervisor agent)
    ↓
Human Approval
```

### 10.15 Agent Monitoring

```
Execution Time
CPU / GPU Utilization
Memory Usage
Failures
Retries
```

### 10.16 Agent Logs

```
Task
Reasoning
Tools Used
Output
Errors
```

### Standard AI Pipeline

```
User Query
     │
     ▼
Context Builder ──→ Gathers workspace context (entities, blocks, relations)
     │
     ▼
Retriever ──→ Semantic + graph-aware retrieval (hybrid search)
     │
     ▼
Inference Runtime ──→ Local (GGUF) or cloud inference engine
     │
     ▼
Agent Platform ──→ Supervisor, Planner, Workers, Memory, Bus
     │
     ▼
Safety Layer (Policy + Permission + Simulation + Diff)
     │
     ▼
Tool Runtime ──→ Registry, Discovery, Permissions, Executor (with User Approval)
     │
     ▼
Gnovium APIs ──→ Entities, Blocks, Relations, Graph, Search, Governance
     │
     ▼
Workspace
```

### High-level API Boundaries

- Editor API (blocks, pages, content)
- Knowledge API (relations, properties)
- Graph API (queries, traversal)
- Search API (semantic + vector)
- Governance API (health, duplicates, orphans)
- Version API (snapshots, branches, diffs)
- Synchronization API (Cloud Mode)

## 11. Memory & Context Management

- **Working Memory:** Current task (per-agent short-term)
- **Semantic Memory:** Vector embeddings via BGE-M3 Large
- **Conversation Context:** Ongoing interactions (per-agent conversation memory)
- **Workspace Context:** Current workspace state (workspace memory)
- **Shared Team Memory:** Cross-agent state via blackboard
- **Workspace Context Builder:** Adapts to mode

## 12. Dual-Mode Operational Features

### Local Mode (Default)

- Full offline operation
- On-device GPU inference (bundled quantized Qwen2.5-3B-Instruct)
- Personal agents only
- Local Agent Runtime (Electron + Flask + SQLite + local vector store)
- Instant performance

### Cloud / Network Mode

- Synchronization of: Workspaces, Pages, Blocks, Relations, Branches, Versions, Embeddings, Graph metadata, Files (metadata), Settings
- Multi-user agent collaboration via shared blackboard
- Distributed inference (optional)
- Shared knowledge graph updates
- Managed backups and scaling

**Sync Philosophy:** Git-inspired (deterministic history + merges) rather than real-time CRDTs.

## 13. Model Lifecycle Summary

```
Qwen2.5-3B-Instruct
    ↓
QLoRA Fine-tuning (4-bit NF4 via Unsloth)
    ↓
LoRA Adapter
    ↓
Merge with Base
    ↓
FP16 Model (~6.2 GB)
    ↓
GGUF Conversion → Q4_K_M
    ↓
≈ 2.0 GB (deployment artifact)
    ↓
Model Registry
    ↓
Desktop (Q4_K_M GGUF) / Cloud (full precision) Deployment
    ↓
Agent Platform
    ↓
Workspace
```

**Total AI Package:**

| Component | Size |
|-----------|------|
| Qwen2.5-3B-Instruct (Q4_K_M GGUF) | ~2.0 GB |
| BGE-M3 Large (embedding model) | ~0.6–1.2 GB |
| **Total** | **~2.6–3.2 GB** |

This architecture delivers a complete V1 platform — a practical AI system built on fine-tuned Qwen2.5-3B-Instruct, multi-agent intelligence, Electron desktop, cloud API, and dual-mode deployment.
