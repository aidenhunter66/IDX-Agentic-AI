# IDX Agentic AI

Multi-agent real estate assistant built on [OpenClaw](https://github.com/openclaw/openclaw) for the IDX Exchange AI Agentic Engineer Internship (Summer 2026).

Queries two MLS datasets in MySQL (`idx_exchange`):
- `rets_property`: active California listings
- `california_sold`: sold transactions (2026)

## Layout
| Path | Contents |
|---|---|
| `skills/` | OpenClaw skills (loaded via `skills.load.extraDirs`) |
| `src/` | Shared TypeScript code (DB access, parsers) |
| `python/` | Analytics, embeddings, RAG |
| `tests/` | Test queries and suites |
| `docs/` | Architecture and schema notes |
| `week-N/` | Weekly deliverable evidence (screenshots, demos) |

## Setup
1. Install OpenClaw and run `openclaw onboard`.
2. Import `rets_property.sql` and `california_sold.sql` into a MySQL database named `idx_exchange`.
3. Copy `.env.example` to `~/.openclaw/.env` and fill in the values.

## Progress
- [x] Week 0: Environment setup ([proof: WhatsApp round-trip](week-0/week0-agentic-ai.png))
- [x] Week 1: Architecture fundamentals
- [x] Week 2: Natural language property search ([tests](week-02/test-results.txt), [WhatsApp demo](week-02/IMG_4040.jpeg))
- [x] Week 3: MLS database integration ([tests](week-03/test-results.txt), [sample output](week-03/sample-output.txt), [WhatsApp search](week-03/IMG_4047.jpeg), [WhatsApp comps](week-03/IMG_4048.png))
