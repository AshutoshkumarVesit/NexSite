# NexSite 🚀

**NexSite** is a production-grade, AI-powered multi-agent website studio and generative workspace. It translates natural language prompts into complete, responsive, beautifully styled, and interactive single-page React applications in real time.

---

## 🌟 Key Features

- **Multi-Agent Generation Pipeline (LangGraph)**:
  - **ProjectManagerAgent**: Requirements extraction, category classification, target audience, brand tone.
  - **UIAgent**: Harmonious color palettes, typography pairings, layout composition, spacing scale.
  - **ContentAgent**: High-converting, domain-specific marketing copy tailored to the prompt.
  - **SEOAgent**: Metadata, OpenGraph cards, schema.org JSON-LD, sitemap XML, robots.txt.
  - **ComponentPlannerAgent**: Category-aware architecture planning 6–12 reusable React components.
  - **DataModelAgent**: Unified JSON source of truth with curated high-res Unsplash photo IDs & navigation anchors.
  - **IntegratorAgent & Self-Healing Pipeline**: Parallel code generation, AST syntax validation, automated repair cycles, and CommonJS bundle compilation.

- **In-Browser Bundle Compiler & Live Sandbox**:
  - Live preview with isolated module scoping (`__require__` CommonJS runtime).
  - Graph-level circular dependency auto-healing and topological Kahn's sorting.
  - Built-in shims for `framer-motion`, `lucide-react`, `react-router-dom`, and `clsx`.
  - Zero-break image guarantee via inline SVG gradient `onError` fallbacks.

- **Production-Grade Design System**:
  - Preloaded Google Web Fonts (`DM Sans`, `Inter`, `Manrope`, `Outfit`, `Playfair Display`, `Plus Jakarta Sans`, `Space Grotesk`).
  - Keyframe CSS animations (`fadeInUp`, `slideInLeft`, `scaleIn`, `float`, `pulse-glow`, `shimmer`).
  - Full support for `prefers-reduced-motion` and native smooth scrolling.

- **Interactive Workspace & Focus Preview**:
  - Collapsible sidebars with smooth animations.
  - One-click **Full Preview Focus Mode** for testing responsive layouts at 100% viewport width.
  - Real-time generation progress bar with milestone indicators and agent terminal activity log.

- **Persistent Supabase Database Integration**:
  - Cloud synchronization for all generated projects and multi-file React bundles.
  - Row Level Security (RLS) policies for protected multi-tenant access.

- **Multi-Provider LLM Fallback Engine**:
  - Automatic API key rotation and multi-provider failover supporting **Groq**, **Google Gemini**, **OpenRouter**, **Nvidia NIM**, **DeepSeek**, **Together AI**, **Kimi (Moonshot)**, and **HuggingFace**.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React
- **Backend / LLM Integration**: Node.js, Express 5, `@supabase/supabase-js`, `dotenv`, `cors`
- **Architecture**: State-machine agent workflows, Babel Standalone in-browser transpilation
- **Testing & Quality**: Vitest, Oxlint, TypeScript strict mode

---

## 📁 Project Structure

```text
NexSite/
├── src/
│   ├── application/            # Workflow orchestrators & LangGraph pipeline
│   ├── backend/                # Express LLM proxy server (server.ts)
│   ├── core/                   # Core entities (PipelineState, interfaces)
│   ├── infrastructure/         # Multi-agent engines, LLM providers, validators
│   │   ├── agents/             # PM, UI, Content, SEO, Planner, DataModel, Integrator, Repair
│   │   ├── llm/                # ProviderManager, ModelRegistry, multi-provider callers
│   │   ├── registry/           # SupportedDependencyRegistry
│   │   └── validators/         # BundleValidator, SyntaxValidator (AST parser)
│   ├── prompts/                # Prompt templates & schema definitions
│   ├── services/               # Supabase client, ProjectRepository, AuthService
│   ├── templates/              # Industry blueprints (SaaS, E-Commerce, Healthcare, etc.)
│   └── ui/                     # User/Admin dashboards, ProjectWorkspace, BundleCompiler
├── public/                     # Static assets & media
├── .env.example                # Example environment configuration
└── vite.config.ts              # Vite bundler configuration
```

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js** (v18+ recommended)
- **npm** or **yarn**
- A **Supabase** account (Free tier)

### 2. Installation

```bash
git clone https://github.com/AshutoshkumarVesit/NexSite.git
cd NexSite
npm install
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials and LLM API keys:

```env
# 1. Primary AI: Groq
GROQ_KEYS=gsk_key1,gsk_key2
GROQ_MODEL=openai/gpt-oss-120b

# 2. Secondary AI: Mistral
MISTRAL_KEYS=your_mistral_api_key
MISTRAL_MODEL=mistral-small-latest

# 3. Tertiary AI: Nvidia
NVIDIA_KEYS=nvapi-your_nvidia_api_key
NVIDIA_MODEL=meta/llama-3.1-70b-instruct

# 4. Quaternary AI: OpenRouter
OPENROUTER_KEYS=sk-or-v1-your_openrouter_api_key
OPENROUTER_MODEL=deepseek/deepseek-chat

PROVIDER_SEQUENCE=Groq,Mistral,OpenRouter,Nvidia
PORT=3001

# Supabase Database Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-publishable-key-here
```

### 4. Supabase Database & Row Level Security Setup

In your **Supabase Dashboard → SQL Editor**, run the following schema migration:

```sql
-- 1. Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL DEFAULT 'guest_user',
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  preview_url TEXT,
  generated_files JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 3. Add RLS Policies
CREATE POLICY "Public projects are viewable by everyone" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Anyone can create projects" ON public.projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update by project ID" ON public.projects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow delete by owner or id" ON public.projects FOR DELETE USING (true);
```

### 5. Running NexSite

#### Frontend Development Server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

#### Backend Server (Optional LLM Proxy):
```bash
npx tsx src/backend/server.ts
```
The backend server runs on `http://localhost:3001`.

---

## 🧪 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Launch Vite frontend with hot module replacement |
| `npm run build` | Compile TypeScript and build production bundle |
| `npm run preview` | Locally preview the production build |
| `npm run lint` | Run Oxlint fast linter |

---

## 📄 License

This project is licensed under the MIT License — see the repository for details.
