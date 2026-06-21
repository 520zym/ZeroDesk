-- 默认任务模板：让 Prompt 模板库与聊天模板引用有可用基础数据

INSERT OR IGNORE INTO workspaces (id, name, path)
VALUES ('default', '默认', '.');

INSERT OR IGNORE INTO workflow_templates (
    id,
    workspace_id,
    name,
    description,
    category,
    icon_name,
    icon_bg,
    parameters_json,
    steps_json
) VALUES
(
    'default-template-competitive-analysis',
    'default',
    '竞品分析',
    '系统分析竞品定位、功能、优势短板与可借鉴策略。',
    '市场研究',
    '📊',
    'bg-primary-light text-primary',
    '["产品名称", "竞品范围", "目标市场", "关注维度"]',
    '["明确分析目标与竞品范围", "对比产品定位、核心功能、用户体验和商业模式", "提炼竞品优势、短板与差异化机会", "输出可执行的产品或市场建议"]'
),
(
    'default-template-technical-research',
    'default',
    '技术调研',
    '围绕技术方案、框架、工具或架构选型进行结构化调研。',
    '技术研究',
    '🔬',
    'bg-success-light text-success',
    '["调研主题", "使用场景", "约束条件", "候选方案"]',
    '["澄清技术目标、边界和关键约束", "梳理候选方案及其成熟度、生态和维护成本", "比较性能、扩展性、安全性和集成复杂度", "给出推荐方案、风险与验证计划"]'
),
(
    'default-template-code-review',
    'default',
    '代码评审',
    '从正确性、可维护性、安全性和测试覆盖角度审查代码。',
    '研发协作',
    '🧩',
    'bg-warning-light text-warning',
    '["代码片段或变更", "业务背景", "重点关注点"]',
    '["先识别潜在 bug、回归风险和边界条件", "检查可读性、模块边界和重复逻辑", "评估安全、性能和异常处理", "按严重程度输出问题、建议和必要测试"]'
),
(
    'default-template-operation-review',
    'default',
    '运营复盘',
    '复盘活动或业务动作的目标、结果、原因和后续动作。',
    '运营分析',
    '📈',
    'bg-sand-light text-sand',
    '["活动背景", "目标指标", "实际结果", "关键事件"]',
    '["还原目标、策略、执行过程和关键节点", "对比目标与实际结果，识别差距", "分析有效动作、失效原因和外部影响", "沉淀经验、改进项和下一步行动"]'
),
(
    'default-template-document-organization',
    'default',
    '文档整理',
    '将零散内容整理为结构清晰、可交付的文档。',
    '内容整理',
    '📝',
    'bg-bg-alt text-text-secondary',
    '["原始材料", "目标读者", "输出格式", "重点信息"]',
    '["提取原始材料中的核心信息和缺口", "设计适合目标读者的文档结构", "重写为清晰、连贯、可扫描的内容", "补充摘要、要点、待确认事项和后续动作"]'
),
(
    'default-template-solution-generation',
    'default',
    '方案生成',
    '基于目标和约束生成可落地的执行方案。',
    '方案设计',
    '💡',
    'bg-primary-light text-primary',
    '["目标", "现状", "约束条件", "期望产出"]',
    '["确认目标、现状和成功标准", "拆解关键问题、依赖和风险", "提出 2 到 3 个可选方案并比较取舍", "给出推荐方案、执行步骤、里程碑和验证指标"]'
);
