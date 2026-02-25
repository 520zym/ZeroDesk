// ─── Task ────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description: string | null;
  goal: string | null;
  status: string;
  cost_tier: string;
  plan_mode: string;
  progress: number;
  total_tokens: number;
  total_cost: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskStep {
  id: string;
  task_id: string;
  agent_id: string;
  step_order: number;
  action: string;
  status: string;
  input_data: string | null;
  output_data: string | null;
  started_at: string | null;
  finished_at: string | null;
}

export interface TaskStats {
  running: number;
  completed: number;
  failed: number;
  draft: number;
}

// ─── Agent ───────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  role: string;
  system_prompt: string | null;
  model_id: string | null;
  temperature: number;
  max_tokens: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Team ────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  description: string | null;
  strategy: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  agent_id: string;
  role_in_team: string;
  priority: number;
}

// ─── Model ───────────────────────────────────────────────────

export interface TestConnectionResult {
  success: boolean;
  latency_ms: number;
  model_count: number;
  error: string | null;
}

export interface ModelProvider {
  id: string;
  name: string;
  base_url: string;
  api_key_encrypted: string | null;
  icon_color: string | null;
  status: string | null;
  avg_latency_ms: number | null;
  models_count: number | null;
  balance_info: string | null;
  enabled: number;
  created_at: string;
  updated_at: string;
}

export interface Model {
  id: string;
  provider_id: string;
  name: string;
  quality_rating: number | null;
  speed_tier: string | null;
  price_per_million_tokens: number | null;
  status: string | null;
  enabled: number;
  created_at: string;
}

export interface FallbackChainEntry {
  id: string;
  chain_order: number;
  model_id: string;
  role: string | null;
}

export interface ResiliencePolicy {
  retry_count: number | null;
  backoff_strategy: string | null;
  token_budget: number | null;
  over_budget_action: string | null;
}

export interface SystemModelAssignment {
  workspace_id: string;
  task_key: string;
  model_id: string;
  updated_at: string;
}

// ─── Skill ───────────────────────────────────────────────────

export interface Skill {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  icon_bg: string | null;
  version: string | null;
  scope: string | null;
  scope_id: string | null;
  status: string | null;
  permissions_json: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceSkill {
  name: string | null;
  description: string | null;
  url: string | null;
  repo: string | null;
  stars: number | null;
  category: string | null;
  updated_at: string | null;
}

export interface MarketplaceSearchResult {
  skills: MarketplaceSkill[];
  total: number;
}

// ─── Knowledge ───────────────────────────────────────────────

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  content_type: string;
  source_url: string | null;
  embedding_status: string;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeVersion {
  id: string;
  item_id: string;
  version_number: number;
  content: string;
  change_summary: string | null;
  created_at: string;
}

// ─── Prompt ──────────────────────────────────────────────────

export interface PromptVersion {
  id: string;
  agent_id: string;
  version_number: number;
  system_prompt: string;
  change_note: string | null;
  created_at: string;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string | null;
  steps_json: string;
  created_at: string;
  updated_at: string;
}

// ─── Execution ───────────────────────────────────────────────

export interface ExecutionMessage {
  id: string;
  task_id: string;
  agent_id: string;
  role: string;
  content: string;
  token_count: number;
  created_at: string;
}

// ─── Settings ────────────────────────────────────────────────

export interface SystemSettings {
  id: number;
  theme: string;
  language: string;
  encryption: boolean;
  archive_days: number;
  task_notify: boolean;
  fail_notify: boolean;
  budget_notify: boolean;
  data_path: string | null;
  skillsmp_api_key: string | null;
  updated_at: string;
}

// ─── Dashboard ───────────────────────────────────────────────

export interface DashboardKpi {
  total_tasks: number;
  running_tasks: number;
  completed_tasks: number;
  failed_tasks: number;
  total_agents: number;
  total_cost: number;
  total_tokens: number;
  avg_completion_time_ms: number;
}

export interface HistoryStats {
  period: string;
  task_count: number;
  success_rate: number;
  avg_cost: number;
  total_tokens: number;
}
