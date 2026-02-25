// ─── Workspace ───────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  root_path: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Task ────────────────────────────────────────────────────

export interface Task {
  id: string;
  workspace_id: string;
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
  workspace_id: string;
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
  workspace_id: string;
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

export interface ModelProvider {
  id: string;
  workspace_id: string;
  name: string;
  provider_type: string;
  base_url: string;
  api_key_encrypted: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Model {
  id: string;
  provider_id: string;
  model_name: string;
  display_name: string;
  context_window: number;
  input_cost_per_token: number;
  output_cost_per_token: number;
  supports_vision: boolean;
  supports_tools: boolean;
  enabled: boolean;
}

export interface FallbackChainEntry {
  id: string;
  workspace_id: string;
  model_id: string;
  priority: number;
  weight: number;
}

export interface ResiliencePolicy {
  id: string;
  workspace_id: string;
  max_retries: number;
  retry_delay_ms: number;
  timeout_ms: number;
  circuit_breaker_threshold: number;
  rate_limit_rpm: number;
}

// ─── Skill ───────────────────────────────────────────────────

export interface Skill {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  skill_type: string;
  definition: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Knowledge ───────────────────────────────────────────────

export interface KnowledgeItem {
  id: string;
  workspace_id: string;
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
  workspace_id: string;
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
