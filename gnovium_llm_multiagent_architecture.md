# Gnovium Inference & Multi-Agent System Architecture (Version 1.1)

Custom GPU-Native Inference Runtime + Global Multi-Agent System  
(Local-First + Network-Aware Design)

## 1. Executive Summary

This architecture delivers a high-performance, custom-built Inference Runtime and multi-agent system that works seamlessly in both Local-First and Cloud/Network modes — matching Gnovium's core design principle.

- **Default:** Fully local, offline, on-device (GPU-native)
- **Network Mode:** Enables synchronization, collaboration, and distributed agent execution when connected
- **Same knowledge model, tools, and agent behaviors across modes**
- **AI subsystem MVP: 1-month focused delivery**

**Key Updates (v1.1):** Modern SLM recommendations, strengthened agent safety pipeline, preserved custom runtime vision.

## 2. Design Principles

- **Local-First:** All core operations work offline with full data ownership
- **Network-Aware:** Graceful upgrade to distributed capabilities when online
- **Mode Transparency:** Same APIs, agent logic, and user experience
- **Performance:** GPU-native kernels for local speed
- **Scalability:** Cloud mode for heavier computation and multi-user coordination
- **Safety-First:** Explicit validation, simulation, and approval gates for agent actions

Environment Variables:
```
GNOVIUM_MODE=local (default)
GNOVIUM_MODE=cloud (network features enabled)
```

## 3. Layered Architecture (Global)

```
Existing Gnovium App (Block Editor + Knowledge Graph)
          |
   Multi-Agent System (Supervisor, Planner, Workers)
          |
   Tool Runtime (Registry, Validator, Executor + Safety Layer)
          |
   Inference Runtime (Scheduler, Engine, KV Cache)
          |
   Model Registry + Small Language Models
          |
   Dual Backend (GPU-Native Local ↔ Cloud Inference)
```

## 4. Inference Runtime (Custom GPU-Native)

- Custom Tensor Engine (C++/CUDA) — long-term strategic differentiator
- GPU Memory Allocator + KV Cache Manager
- Transformer forward pass (RoPE, Attention, LayerNorm, MLP)
- Basic Flash Attention support
- Tokenizer + Advanced Sampling
- **Model Loader & Registry**: Supports multiple instruction-tuned SLMs. Recommended models evolve as the ecosystem advances.
- Practical MVP backends (llama.cpp, ONNX Runtime, TensorRT-LLM) provide a working AI subsystem day one; the custom GPU-native runtime remains the long-term strategic differentiator and will replace these as it matures.
- **Local Mode:** Full GPU acceleration on user device
- **Cloud Mode:** Optional offloading to managed GPU instances

## 5. Multi-Agent System (Global Design)

- **Supervisor Agent:** Orchestrates tasks, decides local vs cloud execution
- **Planner Agent:** Breaks down complex workspace tasks
- **Worker Agents:**
  - Editor Agent (CRUD on blocks, pages, relations)
  - Knowledge Agent (graph queries, relations, search)
  - Governance Agent (health checks, duplicates, orphans)
  - File/Settings Agent
- **ReAct + Task State Machine**
- **Mode-Aware Execution:**
  - Local: All agents run on-device
  - Cloud: Agents can coordinate across users/devices, use shared context

### Agent Execution Safety (Critical Improvement)

All agent-driven modifications follow a staged, auditable pipeline:

```
LLM Output / Planner
     ↓
Policy Validator (content policies, workspace rules)
     ↓
Permission Validator (user scopes, branch protection, etc.)
     ↓
Simulation / Dry-Run (compute proposed changes without applying)
     ↓
Diff Generation (human-readable preview)
     ↓
Explicit User Approval (configurable auto-approve for low-risk actions)
     ↓
Execution via Tool Runtime
```

This replaces direct LLM → CRUD paths and significantly reduces risk of unintended or destructive changes.

Read-only tools (search, graph queries, health checks) bypass the approval stage entirely. Destructive operations (deletes, bulk edits, permission changes) always require explicit confirmation. This keeps the execution model practical while maintaining safety where it matters.

## 6. Tool Runtime (Unified)

- JSON schema-based tool registry
- **Enhanced Safety + Permission Validator** layer (policy + permission checks)
- Simulation & Diff capabilities
- Direct integration with Gnovium's stable APIs
- Network-aware tools (sync, collaboration primitives in Cloud mode)

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
Inference Runtime ──→ GPU-native (local) or cloud inference engine
     │
     ▼
Multi-Agent Runtime ──→ Supervisor, Planner, Worker Agents
     │
     ▼
Safety Layer (Policy + Permission + Simulation + Diff)
     │
     ▼
Tool Runtime ──→ Registry, Validator, Executor (with User Approval)
     │
     ▼
Gnovium APIs ──→ Entities, Blocks, Relations, Graph, Search, Governance
     │
     ▼
Workspace
```

### High-level API Boundaries

Agents interact via these contracts:
- Editor API (blocks, pages, content)
- Knowledge API (relations, properties)
- Graph API (queries, traversal)
- Search API (semantic + vector)
- Governance API (health, duplicates, orphans)
- Version API (snapshots, branches, diffs)
- Synchronization API (Cloud Mode)

## 7. Memory & Context Management

- **Working Memory:** Current task
- **Semantic Memory:** Vector embeddings
- **Conversation Context:** Ongoing interactions
- **Workspace Context Builder:** Adapts to mode

### Embedding Flow

```
Embedding Generation → Vector Store (Local / Cloud) → Retrieval
```

## 8. Dual-Mode Operational Features

### Local Mode (Default)

- Full offline operation
- On-device GPU inference
- Personal agents only
- Instant performance
- SQLite + local vector store

### Cloud / Network Mode

- Synchronization of: Workspaces, Pages, Blocks, Relations, Branches, Versions, Embeddings, Graph metadata, Files (metadata), Settings
- Multi-user agent collaboration
- Distributed inference (optional)
- Shared knowledge graph updates
- Managed backups and scaling

**Sync Philosophy:** Git-inspired (deterministic history + merges) rather than real-time CRDTs. This choice enables explicit versioning, branching workflows, and clean conflict resolution — the same model developers rely on for code — rather than eventual-consistency heuristics. Dual storage (append-only local vs changesets in cloud) is preserved.

## 9. 30-Day Implementation Roadmap (MVP)

| Week | Focus |
|------|-------|
| Week 1 | Custom Tensor Engine + GPU Backend + Basic Transformer + Model Registry |
| Week 2 | KV Cache, Tokenizer, Sampling, Model Loader + Local Mode |
| Week 3 | Tool Registry, Enhanced Safety Layer (Policy/Permission/Simulation/Diff), ReAct Loop, Basic Agents |
| Week 4 | Multi-agent orchestration, Staged Execution Pipeline, Dual-mode switching, Integration + Testing |

## 10. Future Enhancements (Post-MVP)

- Advanced distributed agents
- Model Routing (multiple local models + optional cloud models)
- Multi-model orchestration
- Autonomous governance agents (with safety gates)
- AI Branch Simulation
- Enhanced sync protocol (if real usage shows limitations)
- Advanced privacy features (BYOK, optional E2E)

---

This architecture preserves Gnovium's **"Start Local. Scale when ready."** philosophy while incorporating stronger safety, modern model recommendations, and practical scalability considerations.
