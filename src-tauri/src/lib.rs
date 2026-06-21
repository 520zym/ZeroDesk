mod commands;
mod context_builder;
mod costing;
mod db;
mod engine;
mod models;

use std::path::PathBuf;

use commands::{
    agents, chat, dashboard, knowledge, models as models_cmd, prompts, search, settings, skills,
    tasks, teams,
};

pub struct DataDir(pub PathBuf);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            use tauri::Manager;

            // 在 Rust 端手动创建主窗口，注入初始化脚本以禁用 WKWebView 原生右键菜单。
            // tauri.conf.json 中已移除 windows 声明，避免重复创建。
            // initialization_script 在页面 JS 执行前注入，比 React useEffect 更早，
            // 能可靠阻止 WKWebView 原生层（NSView）的 contextmenu 拦截。
            tauri::WebviewWindowBuilder::new(
                app,
                "main",
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("ZeroDesk")
            .inner_size(1280.0, 800.0)
            .min_inner_size(1024.0, 700.0)
            .center()
            .decorations(true)
            .initialization_script(
                "document.addEventListener('contextmenu', function(e) { e.preventDefault(); }, { capture: true });",
            )
            .build()?;

            let app_data_dir = app.path().app_data_dir().expect("failed to resolve app data dir");

            let pool = tauri::async_runtime::block_on(async {
                db::init_db(&app_data_dir).await.expect("failed to initialize database")
            });

            let data_dir = tauri::async_runtime::block_on(async {
                resolve_data_dir(&pool, &app_data_dir).await
            });

            for sub in ["files", "exports", "logs", "skills"] {
                std::fs::create_dir_all(data_dir.join(sub)).ok();
            }

            tracing::info!("Data directory resolved to {}", data_dir.display());
            app.manage(DataDir(data_dir));
            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // workspace (kept for internal use)
            // tasks
            tasks::list_tasks,
            tasks::list_running_tasks,
            tasks::get_task,
            tasks::create_task,
            tasks::update_task,
            tasks::update_task_status,
            tasks::delete_task,
            tasks::get_task_stats,
            tasks::list_task_steps,
            tasks::create_task_step,
            tasks::update_task_step_status,
            tasks::update_task_step,
            tasks::delete_task_step,
            tasks::reorder_task_steps,
            tasks::list_execution_messages,
            tasks::create_execution_message,
            tasks::list_task_step_summaries,
            tasks::initialize_task_from_team,
            tasks::smart_plan_task,
            tasks::start_task_execution,
            tasks::list_task_runs,
            tasks::list_all_latest_task_runs,
            tasks::rerun_task,
            tasks::send_user_message,
            tasks::resume_execution,
            tasks::adjust_direction,
            tasks::regenerate_message,
            // chat
            chat::list_chat_conversations,
            chat::create_chat_conversation,
            chat::update_chat_conversation,
            chat::delete_chat_conversation,
            chat::list_chat_messages,
            chat::list_chat_attachments,
            chat::clear_chat_context,
            chat::get_chat_conversation_stats,
            chat::send_chat_message,
            // agents
            agents::list_agents,
            agents::get_agent,
            agents::create_agent,
            agents::update_agent,
            agents::delete_agent,
            agents::optimize_prompt,
            // teams
            teams::list_teams,
            teams::create_team,
            teams::update_team,
            teams::add_team_member,
            teams::remove_team_member,
            teams::get_team_members,
            teams::list_all_team_members,
            teams::delete_team,
            teams::smart_plan_team,
            teams::execute_team_plan,
            // models
            models_cmd::list_providers,
            models_cmd::create_provider,
            models_cmd::update_provider,
            models_cmd::delete_provider,
            models_cmd::list_models,
            models_cmd::list_workspace_models,
            models_cmd::toggle_provider_enabled,
            models_cmd::toggle_model_enabled,
            models_cmd::update_model_price,
            models_cmd::batch_toggle_models,
            models_cmd::test_provider_connection,
            models_cmd::fetch_provider_models,
            models_cmd::get_system_model_assignments,
            models_cmd::set_system_model_assignment,
            models_cmd::get_fallback_chain,
            models_cmd::get_resilience_policy,
            models_cmd::update_resilience_policy,
            // skills
            skills::list_skills,
            skills::create_skill,
            skills::update_skill,
            skills::delete_skill,
            skills::search_marketplace_skills,
            skills::install_marketplace_skill,
            skills::scan_external_skills,
            skills::validate_skill_folder,
            skills::scan_local_folder,
            skills::import_local_skill,
            skills::import_scanned_skill,
            // knowledge
            knowledge::list_knowledge_folders,
            knowledge::create_knowledge_folder,
            knowledge::rename_knowledge_folder,
            knowledge::delete_knowledge_folder,
            knowledge::list_knowledge_items,
            knowledge::get_knowledge_item,
            knowledge::create_knowledge_item,
            knowledge::update_knowledge_item,
            knowledge::delete_knowledge_item,
            knowledge::move_knowledge_item,
            knowledge::list_knowledge_versions,
            // prompts & workflow templates
            prompts::list_prompt_versions,
            prompts::create_prompt_version,
            prompts::refine_prompt,
            prompts::list_prompt_templates,
            prompts::list_workflow_templates,
            prompts::create_workflow_template,
            // search
            search::global_search,
            // settings
            settings::get_settings,
            settings::update_settings,
            settings::refresh_exchange_rate,
            settings::get_data_path,
            // dashboard
            dashboard::get_dashboard_kpis,
            dashboard::get_history_stats,
            dashboard::list_history_tasks,
            dashboard::get_weekly_task_trend,
            dashboard::get_agent_usage_ranking,
            dashboard::get_cost_distribution,
            dashboard::get_task_duration_distribution,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn resolve_data_dir(pool: &sqlx::SqlitePool, _app_data_dir: &std::path::Path) -> PathBuf {
    let row: Option<(Option<String>,)> =
        sqlx::query_as("SELECT data_path FROM system_settings WHERE id = 1")
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();

    let default_dir = dirs::home_dir()
        .expect("failed to resolve home directory")
        .join(".zerodesk");

    let path = row
        .and_then(|(p,)| p)
        .filter(|p| !p.is_empty())
        .map(PathBuf::from)
        .unwrap_or(default_dir);

    std::fs::create_dir_all(&path).ok();
    path
}
