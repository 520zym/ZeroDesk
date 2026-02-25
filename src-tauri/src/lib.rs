mod commands;
mod db;
mod models;

use commands::{agents, dashboard, knowledge, models as models_cmd, prompts, settings, skills, tasks, teams, workspace};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            use tauri::Manager;
            let app_data_dir = app.path().app_data_dir().expect("failed to resolve app data dir");

            let pool = tauri::async_runtime::block_on(async {
                db::init_db(&app_data_dir).await.expect("failed to initialize database")
            });

            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // workspace
            workspace::list_workspaces,
            workspace::create_workspace,
            workspace::get_workspace,
            // tasks
            tasks::list_tasks,
            tasks::get_task,
            tasks::create_task,
            tasks::update_task_status,
            tasks::get_task_stats,
            tasks::list_task_steps,
            tasks::create_task_step,
            tasks::list_execution_messages,
            // agents
            agents::list_agents,
            agents::get_agent,
            agents::create_agent,
            agents::update_agent,
            agents::delete_agent,
            // teams
            teams::list_teams,
            teams::create_team,
            teams::update_team,
            teams::add_team_member,
            teams::remove_team_member,
            teams::get_team_members,
            // models
            models_cmd::list_providers,
            models_cmd::create_provider,
            models_cmd::update_provider,
            models_cmd::list_models,
            models_cmd::get_fallback_chain,
            models_cmd::get_resilience_policy,
            models_cmd::update_resilience_policy,
            // skills
            skills::list_skills,
            skills::create_skill,
            skills::update_skill,
            // knowledge
            knowledge::list_knowledge_items,
            knowledge::get_knowledge_item,
            knowledge::create_knowledge_item,
            knowledge::update_knowledge_item,
            knowledge::list_knowledge_versions,
            // prompts & workflow templates
            prompts::list_prompt_versions,
            prompts::create_prompt_version,
            prompts::list_workflow_templates,
            prompts::create_workflow_template,
            // settings
            settings::get_settings,
            settings::update_settings,
            // dashboard
            dashboard::get_dashboard_kpis,
            dashboard::get_history_stats,
            dashboard::list_history_tasks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
