# 个人简历

## 基本信息

- **工作年限**：5 年
- **岗位方向**：前端架构师 / 高级前端工程师
- **技术栈**：React · TypeScript · Node.js · single-spa · SystemJS · Formily · Vite · Webpack · LangChain · Milvus · Docker

---

## 专业技能

- **架构设计**：主导企业级薪酬福利平台（21 个微前端子应用）的架构演进，从单体到微前端的渐进式重构；设计跨应用状态管理、共享依赖治理、样式/JS 隔离、子应用通信等核心机制，沉淀为团队微前端落地方案模板
- **前端基础设施**：搭建公共组件库 @cb/common（HTTP 封装、安全组件、拖拽排序、下载中心等 10+ 组件），建立统一的 CI/CD 流水线、ErrorBoundary + IM 告警体系、Omega 埋点规范，覆盖 21 个子应用的开发→构建→部署→监控全链路
- **复杂业务建模**：设计声明式表单引擎（Formily JSON Schema + x-reactions 联动）、配置驱动的行内可编辑表格（30+ 字段类型注册表 + 双重校验体系 + 动态列 Schema 迁移），将 2000+ 行的命令式业务代码重构为 Schema 配置化，新表单开发效率提升 50%
- **性能工程**：建立"构建→加载→运行→网络"四维优化体系，Webpack externals 减小 60% 产物体积、ECharts Tree-Shaking + 自定义 useEcharts 生命周期管理、react-window 虚拟滚动集成 Formily 表单状态、防竞态请求模式（fetchId ref）
- **AI 工程化**：设计并落地 RAG + Agent 架构的薪酬 AI 助手，构建向量化知识库 + 分层检索策略（准确率 65%→89%）、Text-to-SQL 自然语言查数据（含安全沙箱与脱敏）、AI 驱动 Formily 表单填充（Human-in-the-Loop），将 AI 能力以组件化方式嵌入现有前端架构
- **技术攻坚**：定位并解决 Formily + React Hooks 闭包陷阱（useRef 镜像模式）、react-window 虚拟滚动卸载后 Formily 字段值丢失、antd Modal z-index 层叠上下文错乱、Redux Reducer splice 变异 Bug（8 处）等多个疑难问题，形成团队级 Bug 排查方法论

---

## 工作经历

### 某互联网大厂 — 前端架构师（2021 至今）

负责公司薪酬福利（C&B）前端项目群的架构设计与技术演进，管理 21 个微前端子应用，覆盖年度激励、异地派遣、绩效管理、薪资核算、数据分析等核心业务，支撑数万名员工的薪酬流程全生命周期管理。推动前端基础设施从"各自为战"到"统一体系"的演进，主导 AI 能力在薪酬业务场景的工程化落地。

**核心贡献：**

- 定义团队微前端架构规范和公共组件库标准，新子应用接入时间从 2 周缩短至 3 天
- 搭建 CI/CD + 告警 + 埋点的前端质量保障体系，线上故障平均发现时间从小时级降至分钟级
- 主导 AI Copilot 项目从 0 到 1 落地，HR 政策查询效率提升 3 倍，表单填写时间缩短 40%
- 推动项目从 Webpack 迁移至 Vite，开发体验指标全面提升（冷启动 30s→2s，HMR 5s→200ms）

---

## 项目经历

### 项目一：薪酬福利微前端平台（C&B Platform）

> 企业内部薪酬福利管理平台，采用 single-spa 微前端架构，21 个独立子应用由 Shell 宿主统一编排，支撑数万名员工薪酬流程全生命周期管理。项目核心挑战：跨应用状态一致性、共享依赖版本治理、复杂业务表单的配置化与可维护性、大规模表格的性能与交互。

**技术栈**：React · Redux · single-spa · SystemJS · Formily · Ant Design · react-dnd · Webpack · ahooks · ECharts

#### 1. 微前端架构设计与治理体系

**问题**：平台从 5 个页面演进到 21 个子应用，原有单体架构面临构建慢（全量构建 8min+）、发布耦合（改一行全量上线）、样式冲突（全局 CSS 互相污染）三重痛点。

**方案**：

- **架构选型**：对比 single-spa / qiankun / Module Federation 三种方案，最终选择 single-spa——团队技术成熟度高，需要可控的隔离策略而非 qiankun 的黑盒沙箱；当时仍在 Webpack 4，Module Federation 的升级成本不可接受
- **共享依赖治理**：设计 webpack externals + Shell importmap 的依赖外部化方案，React/antd/axios 等框架级依赖由 Shell 统一加载保证全局单例，子应用产物从 ~2MB 降至 ~200KB；建立共享库升级流程（Shell 先行升级 → 子应用逐个回归 → 灰度发布），antd 4→5 大版本升级期间同时加载新旧两套样式，实现零故障迁移
- **跨应用通信架构**：设计两层通信机制——Redux Store 共享（Shell 创建全局 Store，通过 `customProps` 注入 `dispatch`/`getState`，子应用两层 Provider 嵌套实现全局 + 局部状态）和 Custom Events 事件总线（非状态性通知，如刷新当前页数据），明确禁止 localStorage / shared Module 通信
- **隔离体系**：样式隔离三策略（CSS Modules 哈希化 + antd prefixCls 前缀 + mount/unmount 动态装卸），弃用 Shadow DOM 因其与 antd Modal/Select 挂载 `document.body` 冲突；JS 隔离采用约定式（ESLint 禁止 `window.xxx = ...`）+ Code Review 强制检查 `unmount` 生命周期清理全局监听器
- **独立部署保障**：Shell 与子应用间的契约式兼容——`customProps` 接口只能新增不能删除/修改签名，共享依赖版本由 Shell 统一管控，子应用 `libraryTarget: 'system'` 产物通过 SystemJS importmap 按需加载

**结果**：子应用独立构建时间从 8min 降至平均 1.5min，新子应用接入从 2 周缩短至 3 天，21 个子应用零样式冲突运行。

#### 2. 声明式表单引擎与闭包陷阱攻坚

**问题**：异地派遣等业务表单字段 20+、联动复杂（变更类型驱动 10+ 字段可见性/可编辑性变化），命令式 onChange 链维护困难且易遗漏；Formily `x-reactions` 函数回调存在陈旧闭包，拿到旧的 state 值导致字段状态异常。

**方案**：

- **Formily JSON Schema 配置化**：将表单结构、联动规则、校验逻辑全部定义为 JSON Schema，`x-reactions` 声明式依赖追踪替代命令式 onChange 链，支持 A→B→C 多级联动自动链式触发；Schema 可序列化存储，为后续 AI 自动生成表单规则奠定基础
- **闭包陷阱系统性解决**：定位根因——Formily 的 `x-reactions` 回调在创建时捕获 `useState` 快照值，后续 setState 不影响已捕获的闭包。设计 `useRef` 镜像 `useState` 模式（7-10 个 ref），封装 `useLatest` Hook（后与 ahooks 实现一致），ref 对象引用不变而 `.current` 始终指向最新值，从根本上解决跨渲染闭包陈旧问题
- **Schema 嵌套治理**：异地派遣表单 Schema 嵌套 5-10 层（最大组件 2048 行），提炼 `processState`/`getEmplInfo` 等公共逻辑，消除 NewDispatch/ChangeDispatch/CancelDispatch 三组件的重复代码

**结果**：异地派遣表单新增字段/联动配置从"改代码 + 联调 + 回归"（2 天）缩短为"改 Schema 配置"（2 小时），闭包问题修复后零复发。

#### 3. 配置驱动的行内可编辑表格系统

**问题**：薪资核算、年度激励等业务需要 30+ 字段类型的行内编辑，原有方案每种字段类型一套 switch-case + 手动校验，新增类型需改动核心组件代码，违反开闭原则且回归成本高。

**方案**：

- **字段类型注册表模式**：设计 `FIELD_TYPE_REGISTRY` 配置映射（component / rules / formatter），EditableCell 根据 `column.type` 从注册表查找，新增类型只需增加配置项，核心组件零改动。当前支持金额/百分比/整数/选择/备注等 30+ 类型
- **per-row Form Context 架构**：每行数据包在独立 Form 实例中，行内校验互相隔离——单行保存只校验当前行，全量保存遍历所有行 Form 实例；`React.memo` 包裹 TableRow 浅比较避免无关行重渲染，配合事件委托（table 级统一监听，`data-row-key` + `data-col-key` 定位）优化 3000+ 单元格性能
- **双重校验体系**：设计前端校验（格式/完整性，阻断保存）与后端校验（业务合理性，`_RedText` 后缀字段仅展示警告不阻断）的职责边界，`hasFrontendError` 门控防止双重报错；后端校验不阻断是因为部分"异常"业务上允许（如高管薪资超限需经理审批而非禁止）
- **增量刷新机制**：编辑保存后仅替换被编辑行数据（`__editRowKey` 标记 + `map` 替换），避免全量 `setState` 导致整表重渲染，保存操作响应时间从 800ms 降至 150ms

**结果**：新增字段类型开发从 1 天缩短至 1 小时，表格编辑流畅度（FPS）从 25 提升至 55+。

#### 4. 动态列配置系统与 Schema 迁移

**问题**：不同业务线、不同职级的用户看到不同的表格列配置，后端动态下发列定义；用户可自定义列顺序和显隐；后端 Schema 变更时线上用户旧配置导致白屏。

**方案**：

- **三层列配置架构**：后端权威列定义（有哪些列、属性）→ 用户偏好配置（顺序/显隐，localStorage 持久化）→ 前端合并策略（用户 order 优先、新增列追加、删除列过滤）
- **react-dnd 拖拽排序**：`useDrag` + `useDrop` 实现列头拖拽，合并两个 ref 到同一 DOM 节点，hover 时通过数组 splice 实时更新列顺序
- **Schema 迁移 `handleList` 方法**：`validLocalOrder = localOrder.filter(key => serverKeys.has(key))` 过滤已删除列 → `newColumns = serverColumns.filter(c => !localKeySet.has(c.key))` 补入新增列 → 版本号机制兜底（版本不一致时全量重置）
- **MutationObserver 创造性方案**：antd Table 不支持阻止表头文字触发排序，使用 MutationObserver 监听排序图标 DOM 变化，仅允许排序图标点击触发行，阻止文字误触

**结果**：后端 Schema 变更导致的线上白屏问题从每月 2-3 次降至零，用户自定义列配置满意度从 60% 提升至 92%。

#### 5. 前端质量保障体系

**问题**：21 个子应用上线后问题发现滞后（靠用户反馈），故障定位困难（缺少上下文），缺乏数据驱动的优化依据。

**方案**：

- **三层错误监控**：ErrorBoundary（捕获渲染阶段错误）→ `window.onerror`（捕获未处理同步错误）→ `unhandledrejection`（捕获未处理 Promise rejection），错误自动推送到企业 IM 频道秒级告警，包含错误堆栈、用户信息、页面 URL
- **Omega 埋点规范**：设计三级埋点体系——页面级（PV/UV，路由变化自动上报）、操作级（关键行为手动上报，如提交审批/保存数据）、曝光级（Intersection Observer 检测模块可见性）；事件命名规范 `{模块}_{动作}_{对象}`，自动附加 timestamp/userId/pageUrl
- **数据驱动优化**：基于埋点漏斗分析发现"异地派遣申请"完成率仅 60%，定位上传附件步骤流失率高，优化交互后完成率提升至 78%；发现"数据分析"模块日活 5% 而"薪资查看"日活 80%，据此优化高频模块懒加载策略
- **CI 质量门禁**：ESLint + Stylelint 在 CI 中强制通过，构建失败阻断部署；`@didi/error-boundary` 统一集成到 Shell，子应用错误不影响其他应用运行

**结果**：线上故障平均发现时间从 30 分钟降至 2 分钟，故障定位时间从 1 小时降至 10 分钟，埋点驱动优化 3 项业务指标提升。

---

### 项目二：员工福利移动端 H5（Benefit Mobile）

> 面向数万员工的福利移动端 H5，运行于公司 App WebView 内。核心技术挑战：移动端 PDF 渲染性能与内存控制、WebView 原生桥接双端差异、弱网与旧设备兼容、安全与缓存策略。

**技术栈**：React 18 · TypeScript · Vite 6 · Ant Design Mobile 5 · React Router v7 · pdfjs-dist · DOMPurify · Omega

#### 1. PDF 渐进渲染引擎

**问题**：现成 PDF 组件（react-pdf）全量渲染后才显示，移动端弱网下首屏等待 5-8s；低端 Android 设备 OOM 崩溃。

**方案**：

- **渐进渲染管线**：首页 Canvas 渲染完成即移除 loading（用户可读）→ 剩余页面后台逐页渲染 → 每页完成通过 `setRenderedPages` 通知 UI 更新；滚动模式配合 Intersection Observer 懒渲染，进入视口才触发该页渲染
- **重试与取消**：3 次线性退避重试（1s/2s/3s，避免指数退避在移动端等待过久）+ AbortController 组件卸载取消（防止 unmounted setState 和带宽浪费）+ pdfjs-dist 的 `getDocument()` 也传入 AbortSignal
- **内存优化**：0.75× devicePixelRatio 渲染节省 44% Canvas 内存、离开视口释放 Canvas 上下文（`canvas.width = 0`）后重新进入按需重绘、Web Worker 解析不阻塞主线程、单页翻页模式为默认（一次只渲染 1 页）

**结果**：PDF 首屏可阅读时间从 5-8s 降至 1.5s，低端设备 OOM 崩溃率从 8% 降至 0.3%。

#### 2. WebView Bridge 双端统一适配层

**问题**：Android（`addJavascriptInterface`，同步调用）和 iOS（`WKScriptMessageHandler`，异步 postMessage）的 Bridge 调用方式、返回值机制完全不同；浏览器 `history.length` 在 WebView 中不可靠导致返回按钮行为异常。

**方案**：

- **统一 Bridge 抽象层**：封装 `bridge.close()`/`bridge.getLanguage()` 等方法，内部处理双端差异（iOS 返回 Promise + callback 映射，Android 直接调用），上层代码无需关心平台差异
- **手动 historyStack**：`useRef` 维护页面栈，路由变化时 push/pop，`length ≤ 1` 时调用 `bridge.close()` 关闭 WebView 而非 `history.back()`；解决 `history.length` 在 WebView 复用上下文时值不准的问题
- **Bridge 就绪检测**：`waitForBridge()` 轮询 + 超时（3s）+ 原生 `bridgeReady` 事件双保险，解决 Android `addJavascriptInterface` 在 `onPageFinished` 后才注入的时序问题

#### 3. 前端缓存架构与安全体系

- **带 TTL 的缓存策略**：`readCache`/`writeCache` 写入时记录时间戳，读取时校验 3 分钟过期 + 数据非空（空数组视为无效）；分级刷新：关键数据（保险/体检）clear-then-fetch + 骨架屏，辅助数据（Banner）stale-while-revalidate 静默刷新；用户变更操作后主动清除相关缓存
- **StrictMode 防重复请求**：`useRef` 布尔标记 `fetchedRef`，首次 effect 设置为 true 后跳过后续调用，解决 React 18 StrictMode 开发模式双重 mount 问题
- **DOMPurify 防 XSS**：搜索高亮使用 `dangerouslySetInnerHTML` 前白名单消毒（仅允许 `mark`/`span`/`br`），构建输入层 encode → 渲染层 DOMPurify → HTTP 层 CSP → Cookie 层 HttpOnly 的多层防御体系
- **WSG 安全校验**：`@didi/wsgsig` 请求签名 + `String.fromCharCode` 混淆 header 名，防止 API 被非法调用

#### 4. Vite 迁移与旧设备兼容

- 从 Webpack 迁移至 Vite 6：冷启动 30s+→< 2s（esbuild 预构建 + ESM 原生按需编译），HMR 3-5s→< 200ms（只重编译修改模块），配置 500+ 行→50 行
- `@vitejs/plugin-legacy` 生成双产物：`<script type="module">`（现代浏览器）+ `<script nomodule>`（Chrome >= 53 / Android 5.x），配合 `regenerator-runtime/runtime` polyfill 保证 async/await 可用
- 解决迁移关键问题：CJS 依赖预构建（`optimizeDeps.include` 指定有问题的入口）、`require.context` → `import.meta.glob`、`process.env` → `import.meta.env`、CSS Modules `localsConvention: 'camelCase'`

---

### 项目三：薪酬福利 AI 智能助手（C&B AI Copilot）

> 面向 HR 和员工的 AI 助手，基于 RAG + Agent 架构，将 LLM 能力工程化地嵌入薪酬业务流程。核心挑战：企业内部知识库的高质量检索、LLM 生成 SQL 的安全可控、AI 与现有 Formily 表单架构的无缝集成、Agent 工具链的可靠性。

**技术栈**：LangChain · OpenAI API · TypeScript · React · Milvus · FastAPI · RAG · Agent

#### 1. RAG 检索增强生成管线

**问题**：薪酬政策文档数千页，HR 查询政策耗时且依赖经验；直接让 LLM 回答会产生幻觉，回答不可信。

**方案**：

- **知识库构建**：政策文档 → 语义分块（按章节/条款边界切分，保留上下文完整性）→ Embedding 向量化 → Milvus 向量数据库存储，支持增量更新
- **多轮对话 RAG 管线**：用户提问 → Query 改写（补全代词、扩展缩写）→ 向量检索 Top-K → 重排序（BM25 + 语义相似度混合排序）→ 构造 Prompt 注入上下文 + 来源引用 → LLM 生成回答
- **分层检索策略**：先按业务域（激励/派遣/绩效/薪资）意图路由，缩小检索范围；域内做语义匹配，避免跨域噪声干扰。检索准确率从 65% 提升至 89%，幻觉率从 22% 降至 5%

#### 2. Text-to-SQL 安全沙箱

**问题**：HR 需要"用中文问数据"，但 LLM 生成的 SQL 存在安全风险（DELETE/DROP、敏感字段暴露、返回行数不可控）。

**方案**：

- **Schema 映射层**：将业务术语（年终奖、职级、派遣类型）映射到数据库字段和枚举值，注入 Prompt 作为 LLM 的"领域知识"，解决 LLM 不了解内部表结构的问题
- **SQL 安全沙箱**：生成的 SQL 经 AST 解析校验——仅允许 SELECT 语句、限制返回行数 ≤ 1000、敏感字段（身份证号、银行卡号）自动替换为脱敏函数；AST 层拦截比正则更可靠，避免绕过攻击
- **结果可视化**：SQL 执行结果自动选择图表类型（时序→折线图，分类→柱状图，占比→饼图），前端 ECharts 渲染

#### 3. AI × Formily 表单架构融合

**问题**：异地派遣表单字段 20+、联动复杂，HR 填写耗时长且易出错；AI 填充结果不可信，直接写入业务系统有风险。

**方案**：

- **自然语言 → Formily Schema**：用户描述变更场景（如"张三从北京派遣到上海，为期 6 个月"），AI 解析实体后映射到 Formily JSON Schema 字段路径，自动填充关键字段（员工、原属地、派遣地、期限），利用现有 Schema 定义保证填充值类型正确
- **AI 生成校验规则**：根据业务描述自动生成 `x-reactions` 联动规则和前端校验规则，输出为标准 Formily Schema 片段，可直接合并到现有表单配置
- **Human-in-the-Loop**：AI 填充结果以高亮样式标记，用户逐项确认或修改后提交；不修改 Formily 的校验和提交流程，AI 填充等效于"预填"，业务数据完整性仍由原有双重校验体系保障

**结果**：HR 异地派遣表单平均填写时间从 15 分钟缩短至 9 分钟（-40%），填写错误率从 12% 降至 4%。

#### 4. Agent 编排与工程化

- **ReAct 推理 + Tool 调用**：基于 LangChain Agent 设计薪酬业务专属 Tool 集合（政策查询、数据检索、表单填充、审批状态查询），Agent 根据用户意图自主拆解子任务、编排工具调用链路；多步推理结果汇总后统一返回
- **上下文窗口管理**：对话历史 + 检索片段 + 工具输出超 Token 限制时，按相关性评分裁剪历史消息，保留关键上下文；长文档采用 Map-Reduce 策略分片摘要再合并
- **流式响应 + 前端体验**：LLM 输出 Server-Sent Events 流式传输，前端逐 Token 渲染打字机效果，减少用户等待感；工具调用过程展示中间步骤，增强可解释性

---

## 技术亮点总结

| 类别 | 核心能力 | 量化成果 |
|------|---------|---------|
| **架构设计** | single-spa 微前端 21 子应用，共享依赖治理 + 隔离体系 + 契约式兼容 | 新子应用接入 2 周→3 天 |
| **业务建模** | Formily Schema 配置化 + 闭包陷阱解决 + InlineEditTable 注册表模式 | 新表单开发效率 +50%，新字段类型 1 天→1 小时 |
| **基础设施** | @cb/common 组件库 + CI/CD 流水线 + ErrorBoundary 告警 + 埋点规范 | 故障发现 30min→2min |
| **性能工程** | externals -60% 产物、ECharts Tree-Shaking、虚拟滚动、防竞态、PDF 渐进渲染 | PDF 首屏 5-8s→1.5s，OOM 崩溃 8%→0.3% |
| **AI 工程** | RAG 问答（准确率 89%）+ Text-to-SQL（安全沙箱）+ AI 表单填充 + Agent 编排 | HR 填表时间 -40%，错误率 12%→4% |

---

## 自我评价

5 年前端架构经验，核心能力在**架构决策**与**技术攻坚**。不满足于"把功能做出来"，更关注"为什么这么做、有什么取舍、遇到什么问题"——从 single-spa vs qiankun vs Module Federation 的选型论证，到 Formily 闭包陷阱的根因定位，到双重校验体系的职责边界划分，每个技术决策都有清晰的推理链路。近一年推动 AI + 前端融合，将 RAG/Text-to-SQL/Agent 能力以工程化方式嵌入现有架构，而非 demo 级拼凑。始终追求从真实业务问题出发，用技术手段产生可量化的业务价值。