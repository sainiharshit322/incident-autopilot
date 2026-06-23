# Incident Autopilot
> An intelligent, microservices-based incident management platform that leverages an AI agent swarm to automate triage, investigation, and resolution.

---

## 📋 Table of Contents
- [About The Project](#-about-the-project)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#️-getting-started)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Screenshots](#-screenshots)
- [Roadmap](#️-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 About The Project
Incident Autopilot is an automated incident management workflow designed for modern SRE and DevOps teams. It solves the problem of slow, manual incident responses by utilizing an AI-driven agent swarm (powered by LangGraph and Google Gemini) to triage alerts, investigate root causes, and propose resolutions asynchronously. Built with a scalable microservices architecture—a robust Java/Spring Boot gateway and a sleek React frontend—it unifies human oversight with intelligent automation, drastically reducing Mean Time To Resolution (MTTR).

---

## ✨ Features
- **AI-Driven Incident Triage & Resolution:** Automated analysis and intelligent note generation using Google Gemini and LangGraph.
- **Asynchronous Agent Swarm:** Python-based microservice orchestrating multi-agent workflows for investigating complex incidents.
- **Secure API Gateway:** Java Spring Boot backend featuring JWT authentication, role-based access, and robust data validation.
- **Modern React Dashboard:** A dark-themed, glassmorphism UI built with Tailwind CSS v4, offering real-time incident monitoring and detailed remediation views.
- **Automated Workflows & Webhooks:** REST APIs for ingesting alerts, triggering AI analysis, and updating status callbacks automatically.
- **Real-Time Notifications:** Seamless integration with Slack SDK for instant status change alerts.
- **Observability Built-In:** Pre-configured Prometheus and Grafana stacks for monitoring gateway and system health.
- **Vector Search Ready:** Uses PostgreSQL with `pgvector` extension for advanced semantic search over runbooks and past incidents.

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19 & Vite** | Fast, modern component-based UI and blazing-fast build tooling. |
| **Tailwind CSS v4** | Utility-first CSS framework for rapid, responsive, and custom design. |
| **React Router DOM** | Client-side routing for navigating between Dashboard, Login, and Incident Details. |
| **Axios** | Handling HTTP requests to the backend API Gateway. |
| **Lucide React** | Beautiful, consistent icons across the application. |

### Backend
| Technology | Purpose |
|---|---|
| **Java 25 & Spring Boot 4.0.6** | Robust API Gateway handling authentication, routing, and core incident CRUD operations. |
| **Python & FastAPI** | High-performance async backend for the AI agent swarm. |
| **LangChain & LangGraph** | Orchestrating multi-step AI agent workflows and state management. |
| **Google GenAI** | Core LLM powering intelligent analysis and resolution proposals. |
| **Spring Security & JWT** | Securing endpoints and handling user authentication. |

### Database & DevOps
| Technology | Purpose |
|---|---|
| **PostgreSQL & pgvector** | Primary relational database with vector search capabilities. |
| **Redis** | Caching and rapid data retrieval. |
| **Docker & Docker Compose** | Containerizing infrastructure (DB, Prometheus, Grafana) for easy local setup. |
| **Prometheus & Grafana** | Scraping metrics and visualizing system health. |
| **GitHub Actions** | Automated CI/CD pipelines. |

---

## 📁 Project Structure

```text
project-root/
├── agent_swarm/       → Python/LangGraph Agent Swarm service for AI triage & resolution
│   ├── agents/        → AI agent definitions and prompts
│   ├── api/           → FastAPI routes and server configuration
│   ├── graph/         → LangGraph state and workflow logic
│   ├── tests/         → DeepEval and Pytest test suites
│   └── tools/         → Custom tools for AI agents
├── alert_gateway/     → Java/Spring Boot API Gateway & incident manager
│   ├── src/main/java/com/incident/alert_gateway/
│   │   ├── controller/ → REST API endpoints
│   │   └── ...         → Models, Services, Security, Repositories
│   └── src/main/resources/ → Application config (application.yml)
├── frontend/          → React UI with Vite & Tailwind CSS
│   ├── src/
│   │   ├── components/ → Reusable UI elements (IncidentCard, RunbookViewer)
│   │   ├── pages/      → Route-level pages (Dashboard, Login, IncidentDetails)
│   │   └── api/        → Axios configurations and API calls
├── infra/             → Docker-compose setup for DBs, Prometheus, Grafana
│   ├── prometheus/    → Prometheus configuration
│   └── docker-compose.yaml
└── .github/           → GitHub Actions for CI/CD pipelines
```

---

## ⚙️ Getting Started

### Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **Java 25**
- **Maven**
- **Docker & Docker Compose**

### Installation

```bash
git clone https://github.com/sainiharshit322/incident-autopilot.git
cd incident-autopilot

cd infra
docker-compose up -d

cd ../alert_gateway
./mvnw clean install
./mvnw spring-boot:run

cd ../agent_swarm
python -m venv venv
source venv/bin/activate  
pip install -r requirements.txt
cp .env.example .env    
uvicorn api.main:app --reload --port 8000

cd ../frontend
npm install
cp .env.local .env        
npm run dev
```

---

## 🔐 Environment Variables

### Agent Swarm (`agent_swarm/.env`)
| Variable | Description | Example |
|---|---|---|
| `GOOGLE_API_KEY` | Google Gemini API key for AI generation | `AIzaSy...` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://incident:incident123@localhost:5432/incidentdb` |
| `GATEWAY_URL` | URL of the Java Alert Gateway | `http://localhost:8080` |
| `SLACK_BOT_TOKEN` | Token for Slack integration | `xoxb-your-token` |
| `SLACK_CHANNEL_ID` | Channel ID for Slack notifications | `C12345678` |

### Alert Gateway (`alert_gateway/src/main/resources/application.yml`)
| Variable | Description | Example |
|---|---|---|
| `spring.datasource.url` | PostgreSQL connection string | `jdbc:postgresql://localhost:5432/incidentdb` |
| `spring.data.redis.host` | Redis host | `localhost` |
| `jwt.secret` | Secret key for JWT signing | `incident-autopilot-secret-key-must-be-at-least-32-characters-long` |

### Frontend (`frontend/.env.local`)
| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL for the Alert Gateway | `http://localhost:8080` |
| `VITE_JWT_TOKEN` | (Dev Only) Default fallback token | `eyJhbGci...` |

---

## 📡 API Documentation

### Auth Routes (Java Gateway)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/token` | Authenticate and get JWT token | No |

### Incident & Alert Routes (Java Gateway)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| POST | `/alerts/webhook` | Ingest new alert from external monitor | Yes |
| GET | `/incidents` | Fetch all incidents | Yes |
| GET | `/incidents/{id}` | Get specific incident details | Yes |
| PATCH| `/incidents/{id}` | Update incident details | Yes |
| PATCH| `/incidents/{id}/status` | Update status (trigger callbacks) | Yes |
| POST | `/incidents/{id}/close` | Mark an incident as resolved | Yes |

### Agent Swarm Routes (Python API)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| GET | `/health` | Service health check | No |
| POST | `/analyze` | Trigger async AI analysis of an incident | Yes |
| POST | `/resolve` | Request an AI resolution strategy | Yes |
| POST | `/notify_status` | Callback to notify swarm of status changes | Yes |

---

## 🗺️ Roadmap
- [ ] **Role-Based Access Control (RBAC):** Restrict actions like incident closure to admin users.
- [ ] **Custom Runbooks Upload:** Allow teams to upload markdown/PDF runbooks for vectorizing and semantic search.
- [ ] **Advanced MTTR Analytics:** Dashboard metrics displaying resolution speed over time.
- [ ] **Jira / PagerDuty Integration:** Two-way sync with external ticketing platforms.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes using Conventional Commits
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---

## 👨‍💻 Author
Harshit Saini
- GitHub: [@sainiharshit322](https://github.com/sainiharshit322)
