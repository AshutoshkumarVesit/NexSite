# NexSite 🚀

**NexSite** is an AI-powered multi-agent web studio and workspace designed to generate, customize, and preview full-featured web applications using modular templates and automated agent workflows.

---

## 🌟 Key Features

- **Multi-Agent Workflow Engine**: Powered by specialized AI personas (Product Manager, UX Designer, Content Strategist, Frontend Developer, Backend Developer, QA Engineer, Security Expert, Optimization Expert).
- **Template Ecosystem**: Pre-configured architectural patterns for SaaS, E-Commerce, Portfolio, Agency, Crypto, Healthcare, Restaurant, and Base websites.
- **In-Browser Bundle Compiler & Live Preview**: Real-time TypeScript/React rendering and visual component sandbox.
- **Resilient LLM Provider Pipeline**: Built-in key-rotation and multi-provider fallback infrastructure supporting **Kimi (Moonshot AI)**, **Google Gemini**, **Groq**, **OpenRouter**, **Together AI**, and **HuggingFace**, with a fallback Mock provider.
- **Express Backend API**: Lightweight server for proxying LLM requests, schema validation, and API rate-limiting/key management.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React
- **Backend / LLM Integration**: Node.js, Express 5, `@google/genai`, `dotenv`, `cors`
- **Linting & Tooling**: Oxlint, Vitest, TSX / Esbuild

---

## 📁 Project Structure

```text
NexSite/
├── src/
│   ├── application/        # Workflow orchestrators & pipeline execution
│   ├── backend/            # Express LLM proxy backend server (server.ts)
│   ├── core/               # Core entities (PipelineState, interfaces)
│   ├── infrastructure/     # LLM provider manager, agent engines, validators & caches
│   │   ├── agents/         # Multi-agent implementations
│   │   └── llm/            # Gemini, Groq, Kimi, OpenRouter, Together, HF providers
│   ├── prompts/            # Prompt templates & data schemas
│   ├── templates/          # Industry templates (SaaS, E-Commerce, Portfolio, etc.)
│   └── ui/                 # Workspace React components & Bundle Compiler
│       └── workspace/      # NexSiteWorkspace & BundleCompiler UI
├── public/                 # Static assets
└── vite.config.ts          # Vite build & dev server configuration
```

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js** (v18+ recommended)
- **npm** or yarn

### 2. Installation

Clone the repository and install dependencies:

```bash
npm install
```

### 3. Environment Configuration

Copy the example environment file and add your LLM API keys:

```bash
cp .env.example .env
```

Edit `.env` to configure your preferred providers and API keys:

```env
GEMINI_KEYS=your_gemini_api_key
GROQ_KEYS=your_groq_api_key
PROVIDER_SEQUENCE=Gemini,Groq,OpenRouter
PORT=3001
```

### 4. Running the Project

#### Development Frontend:
Start the Vite development server with HMR:

```bash
npm run dev
```

The application will be accessible at `http://localhost:5173`.

#### Express Backend (Optional / LLM Proxy):
Start the Express server for server-side generation:

```bash
npx tsx src/backend/server.ts
```

The backend server runs on `http://localhost:3001`.

---

## 🧪 Commands & Scripts

- `npm run dev`: Launch Vite frontend dev server
- `npm run build`: Build production TypeScript & Vite bundle
- `npm run lint`: Run Oxlint linter
- `npm run preview`: Preview production build locally

---

## 📄 License

This project is proprietary / open for development within NexSite studio workflows.

