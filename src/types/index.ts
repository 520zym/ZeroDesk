// ─── Task ────────────────────────────────────────────────────

export interface Task {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  goal: string | null;
  status: string;
  cost_tier: string | null;
  plan_mode: string | null;
  quality_gate: string | null;
  retry_policy: string | null;
  over_budget_policy: string | null;
  timeout_minutes: number | null;
  total_tokens: number | null;
  total_cost: number | null;
  progress: number | null;
  team_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TaskRun {
  id: string;
  task_id: string;
  run_number: number;
  status: string;
  total_tokens: number | null;
  total_cost: number | null;
  progress: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface TaskStep {
  id: string;
  task_id: string;
  step_order: number;
  name: string;
  description: string | null;
  agent_id: string | null;
  output_target: string | null;
  status: string | null;
  tokens_used: number | null;
  duration_seconds: number | null;
  run_id: string | null;
  created_at: string;
}

export interface TaskStats {
  total: number;
  running: number;
  completed: number;
  failed: number;
  draft: number;
}

export interface TaskStepSummary {
  task_id: string;
  total_steps: number;
  completed_steps: number;
}

// ─── Agent ───────────────────────────────────────────────────

export interface Agent {
  id: string;
  workspace_id: string;
  name: string;
  avatar_char: string | null;
  avatar_color: string | null;
  role_description: string | null;
  system_prompt: string | null;
  model_id: string | null;
  fallback_model_id: string | null;
  tools_json: string | null;
  skills_json: string | null;
  is_template: number | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

// ─── Team ────────────────────────────────────────────────────

export interface Team {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string | null;
  shared_skills_json: string | null;
  task_count: number | null;
  success_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  team_id: string;
  agent_id: string;
}

// ─── Smart Team Planning ─────────────────────────────────────

export interface AgentPlan {
  name: string;
  avatar_char: string;
  avatar_color: string;
  role_description: string;
  system_prompt: string;
  tools: string[];
  skills: string[];
  model_id: string | null;
  model_name: string | null;
  fallback_model_id: string | null;
  fallback_model_name: string | null;
  is_existing: boolean;
  existing_agent_id: string | null;
}

export interface TeamPlan {
  team_name: string;
  team_description: string;
  team_color: string;
  agents: AgentPlan[];
  shared_skills: string[];
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
  context_window_tokens: number | null;
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

export interface KnowledgeFolder {
  id: string;
  workspace_id: string;
  name: string;
  created_at: string;
}

export interface KnowledgeItem {
  id: string;
  workspace_id: string;
  folder: string | null;
  title: string;
  content: string | null;
  content_type: string | null;
  tags_json: string | null;
  visibility: string | null;
  version: number | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeVersion {
  id: string;
  item_id: string;
  version: number;
  content: string | null;
  change_note: string | null;
  created_at: string;
}

// ─── Prompt ──────────────────────────────────────────────────

export interface PromptVersion {
  id: string;
  agent_id: string;
  version: number;
  content: string;
  note: string | null;
  is_stable: number | null;
  quality_score: number | null;
  cost_change: number | null;
  created_at: string;
}

export interface PromptTemplateEntry {
  agent_id: string;
  agent_name: string;
  avatar_char: string | null;
  avatar_color: string | null;
  role_description: string | null;
  prompt_content: string;
  version: number;
  note: string | null;
  version_created_at: string;
}

export interface WorkflowTemplate {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  category: string | null;
  icon_name: string | null;
  icon_bg: string | null;
  parameters_json: string | null;
  steps_json: string | null;
  usage_count: number | null;
  created_at: string;
  updated_at: string;
}

// ─── Execution ───────────────────────────────────────────────

export interface ExecutionMessage {
  id: string;
  task_id: string;
  sender_type: string;
  sender_id: string | null;
  sender_name: string | null;
  content: string;
  content_type: string | null;
  metadata_json: string | null;
  run_id: string | null;
  step_id: string | null;
  reply_to_id: string | null;
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
  total_teams: number;
  total_tokens: number;
  total_cost: number;
}

export interface HistoryStats {
  total: number;
  completed: number;
  failed: number;
  success_rate: number;
  avg_duration_seconds: number;
  total_cost: number;
}

// ─── Dashboard Charts ────────────────────────────────────────

export interface DailyTaskCount {
  day: string;
  count: number;
}

export interface AgentUsageRank {
  agent_id: string;
  agent_name: string;
  avatar_char: string | null;
  avatar_color: string | null;
  usage_count: number;
}

export interface CostDistributionEntry {
  name: string;
  cost: number;
  percentage: number;
}

export interface DurationBucket {
  label: string;
  count: number;
}

// ─── Search ──────────────────────────────────────────────────

export type SearchEntityType =
  | "knowledge"
  | "task"
  | "agent"
  | "team"
  | "skill"
  | "model"
  | "workflow";

export interface SearchResultItem {
  id: string;
  entity_type: SearchEntityType;
  title: string;
  subtitle: string | null;
  snippet: string | null;
  rank: number;
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
}
