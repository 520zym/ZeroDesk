use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub path: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Task {
    pub id: String,
    pub workspace_id: String,
    pub title: String,
    pub description: Option<String>,
    pub goal: Option<String>,
    pub status: String,
    pub cost_tier: Option<String>,
    pub plan_mode: Option<String>,
    pub quality_gate: Option<String>,
    pub retry_policy: Option<String>,
    pub over_budget_policy: Option<String>,
    pub timeout_minutes: Option<i64>,
    pub total_tokens: Option<i64>,
    pub total_cost: Option<f64>,
    pub progress: Option<i64>,
    pub team_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TaskRun {
    pub id: String,
    pub task_id: String,
    pub run_number: i64,
    pub status: String,
    pub total_tokens: Option<i64>,
    pub total_cost: Option<f64>,
    pub progress: Option<i64>,
    pub started_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TaskStep {
    pub id: String,
    pub task_id: String,
    pub step_order: i64,
    pub name: String,
    pub description: Option<String>,
    pub agent_id: Option<String>,
    pub output_target: Option<String>,
    pub status: Option<String>,
    pub tokens_used: Option<i64>,
    pub duration_seconds: Option<f64>,
    pub run_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Agent {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub avatar_char: Option<String>,
    pub avatar_color: Option<String>,
    pub role_description: Option<String>,
    pub system_prompt: Option<String>,
    pub model_id: Option<String>,
    pub fallback_model_id: Option<String>,
    pub tools_json: Option<String>,
    pub skills_json: Option<String>,
    pub is_template: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
    pub last_used_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Team {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub shared_skills_json: Option<String>,
    pub task_count: Option<i64>,
    pub success_rate: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TeamMember {
    pub team_id: String,
    pub agent_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ModelProvider {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub base_url: String,
    pub api_key_encrypted: Option<String>,
    pub icon_color: Option<String>,
    pub status: Option<String>,
    pub avg_latency_ms: Option<i64>,
    pub models_count: Option<i64>,
    pub balance_info: Option<String>,
    pub enabled: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Model {
    pub id: String,
    pub provider_id: String,
    pub name: String,
    pub quality_rating: Option<i64>,
    pub speed_tier: Option<String>,
    pub price_per_million_tokens: Option<f64>,
    pub status: Option<String>,
    pub enabled: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FallbackChainEntry {
    pub id: String,
    pub workspace_id: String,
    pub chain_order: i64,
    pub model_id: String,
    pub role: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ResiliencePolicy {
    pub workspace_id: String,
    pub retry_count: Option<i64>,
    pub backoff_strategy: Option<String>,
    pub token_budget: Option<i64>,
    pub over_budget_action: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Skill {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub description: Option<String>,
    pub icon_name: Option<String>,
    pub icon_bg: Option<String>,
    pub version: Option<String>,
    pub scope: Option<String>,
    pub scope_id: Option<String>,
    pub status: Option<String>,
    pub permissions_json: Option<String>,
    pub source: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct KnowledgeItem {
    pub id: String,
    pub workspace_id: String,
    pub folder: Option<String>,
    pub title: String,
    pub content: Option<String>,
    pub content_type: Option<String>,
    pub tags_json: Option<String>,
    pub visibility: Option<String>,
    pub version: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct KnowledgeVersion {
    pub id: String,
    pub item_id: String,
    pub version: i64,
    pub content: Option<String>,
    pub change_note: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PromptVersion {
    pub id: String,
    pub agent_id: String,
    pub version: i64,
    pub content: String,
    pub note: Option<String>,
    pub is_stable: Option<i64>,
    pub quality_score: Option<f64>,
    pub cost_change: Option<f64>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WorkflowTemplate {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub icon_name: Option<String>,
    pub icon_bg: Option<String>,
    pub parameters_json: Option<String>,
    pub steps_json: Option<String>,
    pub usage_count: Option<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ExecutionMessage {
    pub id: String,
    pub task_id: String,
    pub sender_type: String,
    pub sender_id: Option<String>,
    pub sender_name: Option<String>,
    pub content: String,
    pub content_type: Option<String>,
    pub metadata_json: Option<String>,
    pub run_id: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLogEntry {
    pub id: String,
    pub workspace_id: String,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub details_json: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SystemSettings {
    pub id: i64,
    pub theme: String,
    pub language: String,
    pub encryption: bool,
    pub archive_days: i64,
    pub task_notify: bool,
    pub fail_notify: bool,
    pub budget_notify: bool,
    pub data_path: Option<String>,
    pub skillsmp_api_key: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TaskStepSummary {
    pub task_id: String,
    pub total_steps: i64,
    pub completed_steps: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SystemModelAssignment {
    pub workspace_id: String,
    pub task_key: String,
    pub model_id: String,
    pub updated_at: String,
}

// --- Provider API response types ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TestConnectionResult {
    pub success: bool,
    pub latency_ms: i64,
    pub model_count: i64,
    pub error: Option<String>,
}

// --- Aggregate / response types ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskStats {
    pub total: i64,
    pub running: i64,
    pub completed: i64,
    pub failed: i64,
    pub draft: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardKpi {
    pub total_tasks: i64,
    pub running_tasks: i64,
    pub completed_tasks: i64,
    pub failed_tasks: i64,
    pub total_agents: i64,
    pub total_teams: i64,
    pub total_tokens: i64,
    pub total_cost: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryStats {
    pub total: i64,
    pub completed: i64,
    pub failed: i64,
    pub success_rate: f64,
    pub avg_duration_seconds: f64,
    pub total_cost: f64,
}
