# C&B 项目难点与亮点总结

> 本文档对 Compensation & Benefits (薪酬福利) 前端项目群的难点和亮点进行系统梳理，覆盖 21 个子项目。

---

## 一、整体架构亮点

### 1. 微前端架构（single-spa）
- 绝大多数子项目采用 **single-spa + SystemJS** 微前端架构，通过 `systemjs-webpack-interop` 管理公共路径
- 共享依赖外部化：React、Redux、Ant Design、axios、moment 等框架级依赖由宿主 Shell 统一加载，子应用通过 webpack externals 引用，避免重复打包
- 子应用统一导出 `bootstrap`/`mount`/`unmount` 生命周期，支持独立部署、热插拔
- 涉及项目：cb-approval、cb-analysis、cb-annual-incentive、cb-annual-incentive-ibg、cb-dispatch、cb-hro、cb-payroll、cb-report 等

### 2. 公共组件库 @cb/common
- 跨微前端共享的业务组件：`request`（HTTP 封装）、`BreadCrumb`（面包屑）、`FormFilter`（筛选器）、`SpecialAdjuestCard`（卡片布局）、`DownloadButton`（下载按钮）、`UploadModal`（上传弹窗）、`DtnamicHeader`（动态表头）、`CardIcon`（图标）、`DropTarget`（拖拽排序）
- 统一的翻译函数 `trans()`、Omega 埋点工具
- SQL 注入防护组件 `SafeInput`

### 3. 统一的部署与监控体系
- CI/CD 流水线：`build.sh` → Artifactory → `deploy.sh` 拉包部署
- ErrorBoundary + IM 告警：`@didi/error-boundary` 集成小桔 IM 频道，运行时错误实时推送
- Omega 埋点：仅在生产环境触发，自动附加时间戳、用户名、页面 URL

---

## 二、各项目难点与亮点

### benefit-mobile-new（福利移动端新）

**难点：**
- **PDF 预览组件** (`pdfPreview/index.tsx`)：使用 pdfjs-dist 手动渲染 Canvas，支持滚动模式和单页模式，含重试逻辑（3 次、梯度退避）和 AbortController 取消机制
- **体检预约流程** (`reservation/index.tsx`，500 行)：多级级联选择（省→市→机构→登录 URL），每级选择重置下游，模糊搜索，双数据源（URL 参数 vs sessionStorage）
- **保险保障页** (`insurance/index.tsx`，427 行)：嵌套数据层级（年份→关系→保障卡→可展开明细行），敏感数据脱敏
- **WSG 安全校验**：`@didi/wsgsig` 请求签名，`String.fromCharCode` 混淆 header 名

**亮点：**
- **sessionStorage 缓存 + TTL 机制**：`readCache`/`writeCache` 带 3 分钟过期和空数据校验，防止过期空状态
- **StrictMode 防重复请求**：`useRef` 布尔标记 `fetchedRef` 防止 React StrictMode 下双重 API 调用
- **PDF 渐进渲染**：首页渲染完成移除 loading，剩余页面后台继续渲染
- **DOMPurify 防 XSS**：搜索结果高亮使用 `dangerouslySetInnerHTML` 前先通过 DOMPurify 消毒
- **Vite Legacy 插件**：支持 Chrome >= 53 / Android 5.x 的旧设备 WebView
- **React Router v7 + 原生 Bridge**：手动维护 `historyStack`，与 Android/iOS 原生 WebView 桥接

---

### cb-analysis（数据分析看板）

**难点：**
- **BiSalaryAnalysis** (763 行)：管理 3 个并发分析结果标签页，支持锁定/解锁语义、单元格点击高亮（行列交叉）、递归列处理（`recurColumns`）适配 API 返回的深层嵌套动态表头
- **SalaryRankCustom** (603 行)：可编辑表格 + 级联模糊搜索（大序列→子序列→小序列），自定义粘贴处理（去逗号）
- **MultipleSelect** (535 行)：下拉框内嵌编辑（增删改 + 拖拽排序 + 重复检测）
- **预算看板动态列**：根据 API Feature Flag 动态插入/移除列组

**亮点：**
- **ECharts Tree-Shaking**：手动按需引入图表类型 + 自定义 `useEcharts` Hook 管理实例生命周期
- **omegaTracker 灵活埋点**：支持字符串/对象/柯里化三种调用模式
- **AnalysisFilter 声明式筛选**：`filterList` 配置化定义筛选条件，`useImperativeHandle` 暴露表单实例
- **CheckableSelect 组合组件**：Checkbox.Group + Select 联动，支持本地过滤和远程模糊搜索
- **ResizeObserver 布局同步**：监听结果容器高度动态调整筛选侧栏高度

---

### cb-annual-incentive（年度激励-国内）

**难点：**
- **多步向导 + 20+ 互联状态** (`CreateProcess/index.js`，822 行)：流程号、状态、步骤完成度、编辑锁、预算数据、审批数据等 20+ 状态互相关联
- **行内可编辑表格** (`Detail/Block/InlineEditTable.js`，558 行)：自定义 `EditableRow`/`EditableCell`，支持百分比/金额/整数/选择/备注等多种单元格类型，双滚动条同步机制
- **流程校验规则引擎** (`VerificationNew.js`，641 行)：动态 Form.List + 国家地区多选去重 + 绩效等级分布区间可编辑表 + 增量刷新
- **拖拽动态表头** (`DynamicHeader`)：react-dnd 实现可排序列配置，localStorage 持久化含 Schema 迁移逻辑
- **双表单系统协调**：CreateProcess 同时使用 Formily 和 Ant Design Form

**亮点：**
- **步骤完成状态机**：多步向导中每步完成状态独立推导，"提交"按钮仅当所有步骤完成时可用
- **增量校验规则刷新**：`getVerificationList(renderIndex)` 只刷新指定规则，避免覆盖其他未保存的编辑
- **50+ Omega 埋点事件**覆盖审批、编辑、分析全流程
- **预算展示多态**：`TotalBox2` 根据国内/海外/额外预算动态切换列布局

---

### cb-annual-incentive-ibg（年度激励-国际业务）

**难点：**
- **InlineEditTable 双重校验系统**：前端校验阻止保存 + 后端警告仅展示（`_RedText` 后缀字段），`hasFrontendError` 门控避免双重报错
- **useDynamicHeader 列配置生命周期**：后端驱动列定义，支持字符串布尔归一化、特殊列（角色专属）保留、`_Hover`/`_RedText` 双后缀元数据
- **DraftBox 草稿管理**：草稿表格 + 清除/应用操作 + `destroyOnClose` z-index Bug 文档化
- **PublishByCountryModal 按国家发布**：`selectedCountriesRef` 跨弹窗保持选择状态
- **MutationObserver 拦截表头排序点击**：仅允许排序图标触发排序，阻止表头文字误触

**亮点：**
- **通信函 PDF 预览**：`LetterPdfPreview` 使用 `useState` 而非 `useMemo` 避免 PDF 切换闪烁 Bug
- **三区域列配置 Drawer**（已选/推荐/可用）：拖拽排序 + 点击切换 + Cookie 记录关闭提示
- **事件总线跨组件通信**：`emit('table-ValidationError')` 触发验证滚动定位
- **纯 CSS 分析可视化**：`DynamicAnalysisTable` 不依赖图表库，用进度条和颜色编码展示预算使用率
- **ahooks useRequest 统一数据获取**：`ready`/`refreshDeps`/`manual` 模式一致使用

---

### cb-common（公共组件库）

**难点：**
- **翻译轮询 + 事件驱动双模式**：`TransLate` 组件请求 Apollo 配置接口，`translationReady` 自定义事件 + `setInterval` 轮询双保险
- **DropTarget 拖拽排序**：中点检测 + 仅 50% 边界穿越触发移动 + 防抖
- **SafeInput SQL 注入防护**：正则过滤 `UNION`/`IS NULL`/`LIKE` 等关键词

**亮点：**
- **DownloadButton 下载动画**：`addAnimation()` 使用 `requestAnimationFrame` 创建橙色圆点飞向下载中心按钮的 CSS 动画
- **DownloadCenter 下载中心**：跨微前端共享的下载队列管理
- **UserGuide 用户指引**：手册/视频链接 + Omega 埋点

---

### cb-dispatch（异地派遣）

**难点：**
- **Formily JSON Schema 超深嵌套**：`ChangeDispatch.jsx` (2048 行) 和 `CancelDispatch.jsx` (1736 行) 的 Formily Schema 嵌套 5-10 层
- **多方向字段联动**：`changeType` 驱动 `startDt`/`endDt`/`dptchLoc`/`actEndDt`/`supvLvl` 等字段可见性和可编辑性，含字符串模板表达式 `{{$deps[0] === '01' && ...}}`
- **Ref 镜像状态**：7-10 个 `useRef` 镜像 `useState` 以解决 Formily 回调闭包陈旧问题
- **大量重复代码**：NewDispatch/ChangeDispatch/CancelDispatch 共享逻辑（`processState`/`getEmplInfo`/`getDeptFormDetail` 等）重复实现，且含相同 Bug（`processState` 中 'T'/'F' case 重复）

**亮点：**
- **Formily 声明式表单**：`x-reactions` 实现响应式字段更新，无需手动事件绑定
- **DChat IM 集成**：审批列表中 `dchat://im/start_conversation?name=` 深度链接直接打开审批人对话
- **异步日期校验**：服务端 API 验证日期合规性（`checkDptchBgnDt.v1/`、`checkDptchEndDt.v1/`）
- **上传 + 进度轮询 + 错误恢复**：UploadModal 三阶段流程完整

---

### cb-hro（绩效数据管理）

**难点：**
- **虚拟滚动 + Formily 集成** (`InlineEditForm.js`)：react-window `VariableSizeGrid` 与 Formily 表单状态集成，虚拟化卸载导致字段值丢失，需回退原始数据
- **可编辑表格条件字段** (`PerformanceReportDetail/index.js`，984 行)：30+ 字段类型动态渲染，`dependentOnName`/`dependentOnValue` 控制条件可见性
- **自定义滚动条** (`ApprovalStream/index.js`，287 行)：完全自定义的水平滚动条，含拖拽/点击跳转/窗口缩放处理

**亮点：**
- **Config 驱动页面组合**：`HroDetail/config.js` 声明式定义页面区域和字段，自定义 Formily 组件渲染
- **useBtnLoading Hook**：封装"点击→加载→请求→反馈"模式，支持 `Modal.confirm` 预确认
- **SelectTable 组件**：下拉框内嵌 Table 替代 Select，支持搜索和行点击选择
- **变更前后对比视图**：`Compare.js` 左右对比绩效数据变更，`isDisable()` 动态判断可编辑性
- **Formily 响应式字段依赖**：修改绩效系数/金额时自动切换"备注"字段为必填

### cb-report（报表）

**难点：**
- 复杂报表动态列和分组逻辑
- 大数据量导出性能优化

**亮点：**
- 报表模板化配置
- 异步导出 + 进度追踪

---

### cb-home（薪酬工作台首页）

**亮点：**
- 作为微前端 Shell 宿主应用，聚合各子应用入口
- 统一的导航和权限控制

---

## 三、共性难点总结

| 类别 | 具体表现 |
|------|----------|
| **超大组件** | 多个页面组件超 500 行（最大 2048 行），状态管理复杂 |
| **技术栈老旧** | benefit-admin-web 仍使用 Webpack 3 + UglifyJS + admin-on-rest |
| **Formily 闭包陷阱** | 多项目使用 useRef 镜像 useState 以解决 Formily 回调陈旧闭包 |
| **代码重复** | 年度激励国内/国际版、派遣新建/变更/取消存在大量重复逻辑 |
| **Redux Bug** | benefit-admin-web 多个 Reducer 存在 splice 变异 Bug |
| **翻译轮询** | 多个子应用使用 10ms setInterval 轮询 localStorage 检测翻译就绪 |
| **硬编码配置** | 环境域名映射、Apollo Token、维护时间窗口等硬编码在源码中 |
| **未使用依赖** | cb-approval 声明了 react-dnd/immer/@ant-design/charts 但未使用 |

## 四、共性亮点总结

| 类别 | 具体表现 |
|------|----------|
| **微前端架构** | single-spa + SystemJS 统一架构，子应用独立部署 |
| **声明式表单** | Formily JSON Schema 驱动复杂业务表单生成 |
| **行内可编辑表格** | EditableCell/EditableRow 模式实现单元格级编辑，含多种输入类型和验证 |
| **动态表头 + 拖拽排序** | react-dnd 实现用户自定义列 + 持久化 + Schema 迁移 |
| **增量刷新** | 保存单条规则时不刷新全部，避免丢失其他未保存编辑 |
| **ECharts Tree-Shaking** | 按需引入图表类型，减小打包体积 |
| **ErrorBoundary + IM 告警** | 运行时错误实时推送企业 IM |
| **Omega 埋点体系** | 仅生产环境触发，50+ 事件覆盖全业务流程 |
| **PDF 渐进渲染** | 首页先渲染移除 loading，后台继续渲染剩余页 |
| **防竞态请求** | fetchId/useRef 模式丢弃过期响应 |
| **WSG 安全校验** | 请求签名防止 API 被非法调用 |
| **下载飞行动画** | 下载成功后橙色圆点飞向下载中心按钮 |
| **DChat IM 集成** | 审批列表中直接发起审批人对话 |

---

## 五、CI/CD 简历优化：需要研究的内容 & 面试高频问题

### 你目前实际在用的 CI/CD 体系

```
代码提交 → build.sh (yarn install + yarn build + 打包 output/)
         → Artifactory (企业制品库存储构建产物)
         → deploy.sh (wget 拉包 → tar 解压 → 部署到 Nginx 静态目录)
         → 线上生效
```

核心脚本：
- **build.sh**：CI 阶段 — 编译打包，生成 `output/` 目录含 web 产物 + deploy 配置
- **deploy.sh**：CD 阶段 — 从 Artifactory 拉取制品，部署到 `/home/xiaoju/static/$DOMAIN/`
- **control.sh**：裸机部署 — IP 环境检测（stage/prod）+ 备份当前版本（`dist.bak`）+ 替换
- **Dockerfile**：容器化部署 — Nginx + supervisord，暴露 8080 端口
- **elevate/cr.yml**：OE 平台 CI 触发配置（refer + owners + strategy）

---

### 应该深入研究的知识点

#### 1. CI/CD 核心概念（必须能讲清楚）

| 主题 | 要搞明白什么 |
|------|-------------|
| CI vs CD vs CD | 持续集成 / 持续交付 / 持续部署 的区别和边界 |
| Pipeline | 流水线的阶段（Stage）、任务（Job）、制品（Artifact）概念 |
| 构建缓存 | node_modules 缓存、Webpack 缓存、Docker layer 缓存如何加速构建 |
| 制品管理 | Artifactory/Nexus 的作用，版本号策略（semver），制品的存储和拉取 |
| 环境管理 | dev/test/staging/production 环境的隔离与流转 |
| 部署策略 | 蓝绿部署、滚动更新、金丝雀发布、灰度发布的原理和适用场景 |

#### 2. 前端特有的 CI/CD 知识（面试高频）

| 主题 | 要搞明白什么 |
|------|-------------|
| 构建优化 | Webpack/Vite 构建提速（thread-loader、esbuild、缓存）、产物分析（webpack-bundle-analyzer） |
| 产物部署 | 静态资源 CDN 部署、HTML 不缓存 + JS/CSS 强缓存 + hash 文件名策略 |
| 版本回滚 | 前端无状态，回滚 = 替换静态文件目录（你的 control.sh 的 `dist.bak` 就是这个思路） |
| 微前端部署 | 子应用独立部署时如何保证 Shell 与子应用版本兼容、共享依赖的一致性 |
| 环境变量注入 | 构建时注入（`REACT_APP_*`）vs 运行时注入（`window.__CONFIG__`）的区别和场景 |
| 代码质量门禁 | ESLint/Stylelint/TSC 在 CI 中跑，构建失败阻断合并（pre-commit + CI 双保险） |

#### 3. 容器化与部署（加分项）

| 主题 | 要搞明白什么 |
|------|-------------|
| Docker 多阶段构建 | builder 阶段编译 → runtime 阶段只用 Nginx，镜像从 GB 级降到 MB 级 |
| Nginx 配置 | SPA 的 `try_files $uri /index.html`、gzip、缓存头、反向代理、CORS |
| supervisord | 为什么用它管理 Nginx 进程（自动重启、日志管理） |
| K8s 基础 | Pod/Service/Deployment 概念，前端静态服务的 K8s 部署方式 |

#### 4. 监控与回滚（体现工程成熟度）

| 主题 | 要搞明白什么 |
|------|-------------|
| 构建监控 | 构建时长追踪、构建失败告警（你的 IM 告警就是一例） |
| 部署验证 | 部署后自动检测页面可访问性（smoke test）|
| 灰度发布 | 先给 5% 流量 → 观察 → 逐步放量到 100% |
| 快速回滚 | 你的 `dist.bak` 备份 + 替换就是一种简单有效的回滚策略 |

---

### 面试官高频问题 & 建议答法

#### Q1：你们的 CI/CD 流程是怎样的？

**建议结构：按阶段讲 + 突出你做了什么**

> 我们有 21 个微前端子应用，统一走 OE 平台的 CI/CD 流水线。流程是：
> 1. **代码提交**触发 CI，执行 `build.sh`：安装依赖、编译构建、生成部署产物
> 2. 构建产物上传到 **Artifactory 制品库**，按版本号归档
> 3. CD 阶段 `deploy.sh` 从制品库拉包，解压部署到 Nginx 静态目录
> 4. 裸机部署用 `control.sh`，通过 IP 检测环境，先备份再替换
>
> 我负责了其中 X 个子应用的构建配置优化，包括 Webpack externals 抽离共享依赖减小产物体积、构建缓存配置将构建时间从 X 分钟降到 Y 分钟。

#### Q2：前端部署和后端部署有什么区别？

> 前端部署本质是**静态文件替换**，无服务端进程：
> - **优势**：回滚简单（换目录即可）、扩容容易（CDN 分发）、无停机风险
> - **挑战**：缓存策略（HTML 不缓存 + JS/CSS content hash 强缓存）、CDN 刷新延迟、微前端子应用版本兼容
> - **后端部署**需要考虑数据库迁移、服务注册发现、滚动更新避免断流等
>
> 我们的方案是 Nginx 托管静态文件 + `Cache-Control: no-store` 对 HTML 不缓存，JS/CSS 用 content hash 文件名实现长期缓存。

#### Q3：微前端如何独立部署？会不会有版本不兼容问题？

> 我们的 21 个子应用都基于 single-spa 架构，各自独立部署：
> - **共享依赖**（React/antd/axios）由 Shell 宿主统一加载，子应用通过 webpack externals 引用，保证全局只有一个 React 实例
> - **版本兼容**通过约定共享依赖版本范围来控制，升级共享库时需要 Shell 和所有子应用同步发布
> - **子应用间通信**通过 Redux Store（Shell 注入）和自定义事件，不直接依赖对方代码
> - **独立部署**的关键是 `libraryTarget: 'system'` + SystemJS 模块加载，子应用只需替换自己的 JS 文件

#### Q4：你们如何处理部署回滚？

> 我们有两套回滚机制：
> 1. **裸机部署**：`control.sh` 每次部署前把当前版本移到 `dist.bak`，回滚只需 `mv dist.bak dist`
> 2. **制品库回滚**：Artifactory 保留了历史版本，指定旧版本号重新部署即可
> 3. 对于容器化部署，回滚就是 `docker run` 指定上一个镜像版本
>
> 实际发生过一次线上 Bug，我们在 3 分钟内完成了回滚，然后定位问题修复后重新发布。

#### Q5：如何优化前端构建速度？

> 我们项目从几方面做了优化：
> 1. **Webpack 层面**：HappyPack/thread-loader 多线程编译、babel-loader 开启 cacheDirectory、SpeedMeasurePlugin 定位慢的 loader
> 2. **依赖层面**：共享库 externals 外部化（React/antd/axios 不打包）、DLLPlugin 预编译不常变的库
> 3. **微前端层面**：每个子应用独立构建，改一个不用全部重新构建，构建时间从单体的 X 分钟降到子应用的 Y 分钟
> 4. **CI 层面**：利用 CI 的缓存机制缓存 node_modules，增量安装只拉变更的包

#### Q6：构建产物如何管理？

> 使用 **Artifactory 制品库**：
> - 每次构建生成 `output/` 目录（含 web 产物 + deploy 配置 + package.json）
> - 按 `{appName}-{version}-{buildNumber}` 归档
> - 部署时通过环境变量 `$OE_ARTIFACTORY_URL` 拉取指定制品
> - 保留最近 N 个版本用于回滚
>
> 这样做的好处是：构建和部署解耦，同一个制品可以部署到 test/staging/production，保证环境一致性。

#### Q7：如何保证线上质量？

> 我们有三层保障：
> 1. **构建时**：ESLint + Stylelint 在 CI 中强制通过，构建失败阻断部署
> 2. **运行时**：`@didi/error-boundary` ErrorBoundary 捕获错误 + 自动推送到小桔 IM 频道，实现秒级告警
> 3. **监控**：Omega 埋点体系覆盖 50+ 关键事件，仅在生产环境触发，自动附加用户信息和页面 URL，便于问题定位

---

### 简历写法建议（结合你的实际经历）

**推荐写法（STAR 原则）：**

> 负责薪酬福利平台 21 个微前端子应用的 CI/CD 流水线搭建与优化：
> - 设计并实现基于 OE 平台 + Artifactory + Shell 脚本的自动化部署流程，支持 21 个子应用独立构建和部署，将发布时间从 X 分钟缩短至 Y 分钟
> - 搭建 Nginx + Docker 双轨部署方案，支持裸机备份回滚（3 分钟内完成）和容器化弹性部署
> - 构建 ErrorBoundary + IM 告警 + Omega 埋点的线上质量保障体系，实现运行时错误秒级告警和 50+ 关键事件追踪
> - 优化 Webpack 构建配置：共享依赖 externals 外部化减小 60% 产物体积，HappyPack + 缓存策略将构建时间降低 40%

**避免的写法：**

> ❌ 熟悉 CI/CD（太笼统，没有具体场景）
> ❌ 使用 Jenkins 部署项目（没有量化结果）
> ❌ 负责项目上线（描述太浅，体现不了技术深度）

---

### 进阶学习路线

```
当前水平：能使用 CI/CD 完成日常部署
    ↓
第一步：理解原理（Pipeline/Artifact/Cache/Deploy Strategy）
    ↓
第二步：掌握前端特有优化（构建提速/缓存策略/微前端部署）
    ↓
第三步：学习容器化（Docker 多阶段构建/K8s 基础）
    ↓
第四步：自动化质量保障（E2E 测试/Smoke Test/灰度发布）
    ↓
第五步：平台化（自研部署平台/构建集群/多环境管理）
```

---

## 六、5 年前端经验：知识体系与面试准备

### 5 年的分水岭

5 年是一个关键节点——面试官不再只问"你会不会"，而是问**"你为什么这么做"**和**"你遇到过什么问题"**。

| 1-3 年 | 5 年+ |
|--------|-------|
| 会用 React 写页面 | 能讲清楚 React 设计理念和取舍 |
| 会配 Webpack | 能优化构建、设计架构、定位疑难杂症 |
| 会写接口联调 | 能设计数据流、处理复杂状态、做容错 |
| 会部署上线 | 能搭建 CI/CD、保证线上质量、做监控告警 |

---

### 一、必须扎实的基础（面试区分度最大）

#### JavaScript 核心

| 知识点 | 面试怎么考 | 你需要掌握到什么程度 |
|--------|-----------|-------------------|
| 事件循环 | 微任务/宏任务执行顺序（几乎每场必问） | 能画完整的执行流程图，讲清 Promise.then vs setTimeout 的时序 |
| 闭包 & 作用域 | 为什么闭包会导致内存泄漏 | 结合你的 Formily 闭包陷阱实战讲 |
| 原型链 | 手写 new、instanceof、Object.create | 能从 `__proto__` 和 `prototype` 两个维度讲清查找链 |
| Promise | 手写 Promise.all/race/allSettled | 能讲清错误穿透机制、then 返回值链式调用原理 |
| this 指向 | 箭头函数 vs 普通函数的 this | 能讲清 bind/call/apply 的区别和实现 |
| 类型系统 | typeof/instanceof 区别 | 能讲清 null 的 typeof 为什么是 "object" 等坑 |

#### CSS

| 知识点 | 要搞明白什么 |
|--------|------------|
| BFC | 触发条件（overflow:hidden、float、position:absolute 等）和实际应用（清除浮动、阻止 margin 合并） |
| Flex & Grid | 实战布局，你项目里大量使用，需能讲出常用属性和常见坑 |
| 层叠上下文 | z-index 失效的根本原因（不是所有元素都创建层叠上下文） |
| 移动端适配 | rem/vw/vh 方案、1px 边框、安全区（你 benefit-mobile-new 用的 `env(safe-area-inset-*)`） |

#### 浏览器

| 知识点 | 要搞明白什么 |
|--------|------------|
| 渲染原理 | DOM → CSSOM → Layout → Paint → Composite 的完整流程 |
| 性能优化 | 重排 vs 重绘的区别、will-change 的作用和副作用、GPU 加速的触发条件 |
| 缓存策略 | 强缓存（Cache-Control/Expires）vs 协商缓存（ETag/Last-Modified）的完整流程 |
| 跨域 | CORS 原理（简单请求 vs 预检请求）、Nginx 代理方案、你项目里的 `Access-Control-Allow-Origin: *` |

---

### 二、React 深度（你的核心框架）

#### 必须能讲清楚的原理

| 主题 | 面试怎么问 | 你怎么答 |
|------|-----------|---------|
| Fiber 架构 | React 16 为什么重写？ | 旧版 Stack Reconciler 递归不可中断 → Fiber 链表可中断恢复，实现时间切片 |
| Diff 算法 | React 怎么做到 O(n) 的 Diff？ | 三层策略：跨层级不比较、同 key 比较、组件类型不同直接替换 |
| Hooks 闭包陷阱 | useState 为什么会拿到旧值？ | 函数组件每次渲染都是新闭包，useRef 保持跨渲染引用 |
| 状态更新 | setState 是同步还是异步？ | React 18 之前在事件处理中批量更新（伪异步），18 之后统一自动批处理 |
| 调度原理 | Concurrent Mode 是什么？ | 时间切片 + 优先级调度，高优任务（用户输入）打断低优任务（数据请求） |

#### 你项目里的实战结合点

| 项目实战 | 面试怎么讲 |
|---------|-----------|
| Formily 闭包问题 | 7-10 个 useRef 镜像 useState 解决陈旧闭包，这是真实案例不是背八股 |
| InlineEditTable 双重校验 | 前端校验阻止保存 + 后端 `_RedText` 警告仅展示，`hasFrontendError` 门控避免双重报错 |
| useDynamicHeader 列配置 | 后端驱动列定义 + 用户自定义持久化 + Schema 迁移，三层架构 |
| MutationObserver 拦截排序 | antd 不支持阻止表头文字触发排序，用 MutationObserver 创造性解决 |
| IncentiveResult 单行刷新 | 编辑后只 re-fetch 被编辑行（`__editRowKey`）而非全量刷新 |

---

### 三、工程化能力（5 年的核心竞争力）

#### 构建工具

| 工具 | 必须掌握 | 你项目里的实战 |
|------|---------|--------------|
| Webpack | loader/plugin 机制、splitChunks 策略、externals 原理、HMR 原理 | 21 个子应用 externals 共享依赖、HappyPack 多线程、SpeedMeasurePlugin 定位瓶颈 |
| Vite | 为什么快（esbuild 预构建 + ESM 原生加载）、和 Webpack 的本质区别 | benefit-mobile-new 已迁移到 Vite 6，可讲迁移动机和效果 |

#### 微前端

| 知识点 | 你需要能讲什么 |
|--------|--------------|
| single-spa 原理 | 生命周期注册（bootstrap/mount/unmount）→ 路由匹配 → 加载/卸载子应用 |
| SystemJS 模块加载 | `libraryTarget: 'system'` + `systemjs-webpack-interop` 的 public path 管理 |
| 共享依赖管理 | webpack externals + 正则匹配 `@ultra/*`、`@cb/*`，保证全局单例 |
| 方案对比 | single-spa vs qiankun（基于 single-spa 封装）vs Module Federation（Webpack 5 原生）vs iframe 的取舍 |
| 你项目实战 | 21 个子应用独立部署、Shell 注入 Redux Store、共享依赖版本约定 |

#### CI/CD（第五节已详细梳理）

构建 → 制品 → 部署 → 回滚全链路，此处不重复。

---

### 四、架构设计能力（高级前端的标志）

#### 状态管理

| 方案 | 核心思想 | 适用场景 | 你项目里的使用 |
|------|---------|---------|--------------|
| Redux | 单向数据流 + 纯函数 Reducer | 中大型应用、需要可预测状态 | Shell 注入 Store 跨微前端共享 |
| MobX | 响应式Observable + 自动追踪依赖 | 中小型应用、追求开发效率 | cb-mobile 声明但未使用（可讲取舍） |
| Zustand | 极简 API + 无 boilerplate | 中小型应用、React 优先 | 可对比你项目为什么选 Redux |
| Context | 组件树共享 | 小范围共享（主题/语言） | 翻译上下文、EditableContext |

#### 组件设计模式

| 模式 | 说明 | 你项目里的实例 |
|------|------|--------------|
| forwardRef + useImperativeHandle | 暴露子组件方法给父组件 | IncentiveResult 暴露 `refresh()`，EditTable 暴露 `cancel()` |
| Compound Component | 复合组件，静态子组件挂载 | `DraftBox.Modal = DraftBoxModal`，`EmployeePerson.Drawer = EmployeePersonDrawer` |
| Event Bus | 跨组件通信，解耦直接依赖 | `emit('table-ValidationError')` 触发验证滚动定位 |
| Render Props / HOC | 逻辑复用 | `wrapWithWarning` HOC 给表单项加后端警告 |
| Config-driven | 配置驱动渲染 | Formily JSON Schema、AnalysisFilter filterList、HroDetail config |

#### 复杂表格方案（你多个项目共有的核心竞争力）

| 能力 | 实现方式 | 涉及项目 |
|------|---------|---------|
| 行内编辑 | EditableCell/EditableRow + per-row Form Context | cb-annual-incentive、cb-annual-incentive-ibg、cb-hro |
| 虚拟滚动 | react-window VariableSizeGrid + Formily 集成 | cb-hro |
| 动态列 | 后端驱动 + 用户自定义 + 拖拽排序 + localStorage 持久化 + Schema 迁移 | cb-annual-incentive、cb-annual-incentive-ibg |
| 双重校验 | 前端校验阻止保存 + 后端 `_RedText` 警告 + `hasFrontendError` 门控 | cb-annual-incentive-ibg |
| 条件字段 | `dependentOnName`/`dependentOnValue` 控制动态可见性 | cb-hro |

---

### 五、性能优化（必须能讲出闭环）

面试官要的不是"我用了 lazy loading"，而是 **"发现问题 → 定位原因 → 解决方案 → 量化效果"** 的闭环：

| 层面 | 你项目里能讲的闭环 |
|------|------------------|
| 构建优化 | 产物体积大 → externals 抽离共享依赖 → 减小 60%；构建慢 → HappyPack + cacheDirectory → 提速 40% |
| 加载优化 | ECharts 全量引入导致包大 → tree-shaking 按需引入 + 自定义 useEcharts Hook 管理 |
| 运行时优化 | 大数据表格卡顿 → react-window 虚拟滚动；快速切换标签重复请求 → fetchId ref 防竞态丢弃过期响应 |
| 渲染优化 | 列配置变化后表头滚动重置 → useLayoutEffect 同步修复；频繁重渲染 → useMemo 缓存列定义 |
| 网络优化 | 页面重复请求 → sessionStorage 缓存 + TTL（3 分钟）+ 空数据校验；输入搜索频繁 → debounce 300ms |
| 移动端优化 | 旧 Android WebView 不兼容 → Vite Legacy 插件支持 Chrome >= 53 |

---

### 六、TypeScript（现在几乎是必考）

#### 必须掌握

| 知识点 | 掌握程度要求 |
|--------|------------|
| 泛型 | 能手写 `Partial<T>`、`Pick<T, K>`、`Omit<T, K>` 的实现 |
| 类型推断 | `infer` 关键字的使用（如 `ReturnType<T>` 的实现） |
| 条件类型 | `T extends U ? X : Y` 的分发特性 |
| 类型守卫 | `is` 关键字、`in` 操作符区分联合类型 |
| 工具类型 | `Record<K, V>`、`Exclude<T, U>`、`Extract<T, U>` |
| 实战 | benefit-mobile-new 已用 TS，可展开讲迁移过程和收益 |

---

### 七、软实力（5 年的隐性门槛）

#### 技术方案设计

面试会让你**白板设计**一个功能，考察：
- 组件拆分粒度
- 状态放哪里（local vs global）
- 数据流怎么设计
- 边界情况考虑（加载态/错误态/空态）

#### 问题排查能力

面试会问：**你遇到过最难的 Bug 是什么？怎么排查的？**

| Bug | 你怎么讲 |
|-----|---------|
| Formily 闭包陈旧值 | Formily 的 x-validator 回调捕获了旧的 state → 通过 useRef 镜像 useState 解决 → 发现这是 Formily + React Hooks 的通用问题 |
| destroyOnClose 导致 Modal z-index 错乱 | 外层 Modal destroyOnClose 后重建的内层 Modal DOM 顺序错乱 → 给内层也加 destroyOnClose → 已在代码中用注释文档化原因 |
| 虚拟滚动卸载后字段值丢失 | react-window 虚拟化卸载 off-screen 单元格 → Formily 字段值变 undefined → 回退原始 list 数据兜底 |
| benefit-admin-web 8 个 Reducer splice Bug | 发现 `...state.list.splice(i, 1)` 是变异操作 → 正确写法应该是 `filter` 或 `slice` → 全量排查并记录 |

#### 代码质量意识

- 你发现并定位了 benefit-admin-web 的 **8 个 Reducer splice 变异 Bug**
- 代码 Review 中你关注什么：不可变性、类型安全、边界处理、依赖清理（如 cb-approval 声明了未使用的 react-dnd/immer）

---

### 八、你的差异化优势（从项目提炼）

别的候选人可能只会说"我用过 React"，但你可以讲：

> 我在一个薪酬福利平台中，负责 **21 个微前端子应用**的开发和维护，涉及年度激励、异地派遣、绩效管理等复杂业务。项目中我解决了：
> 1. **微前端共享依赖版本管理**：通过 webpack externals + SystemJS 实现 React/antd 全局单例
> 2. **Formily 声明式表单 + 闭包陷阱**：用 useRef 镜像模式解决陈旧闭包问题
> 3. **30+ 字段类型的行内可编辑表格**：支持前端校验 + 后端警告双重校验体系
> 4. **CI/CD 全链路**：从 build.sh 到 Artifactory 到 deploy.sh 的自动化部署
> 5. **ErrorBoundary + IM 告警 + 50+ 埋点**的线上质量保障体系

这些都是**真实项目、真实问题、真实方案**，比背八股文有说服力得多。

---

### 九、学习优先级

```
🔥 必须补强（面试高频 + 你当前薄弱）
├── JS 核心：事件循环、Promise 手写、闭包实战
├── React 原理：Fiber、Diff、Hooks 闭包、调度
├── TypeScript：泛型、类型体操基础
└── 网络与浏览器：缓存、跨域、渲染原理

💪 继续深化（你有实战，需要理论化）
├── 微前端架构：从会用到能讲原理
├── 构建优化：从配置到能设计优化方案
├── 性能优化：从零散手段到闭环方法论
└── 状态管理：从用到能对比方案取舍

✨ 加分项（拉开差距）
├── Node.js 基础（BFF 层、SSR）
├── Docker/K8s 基础
├── 自动化测试（Jest + React Testing Library）
└── 架构设计方法论
```

**核心建议：把你项目里已经做过的事情，从"我用了"升级为"我理解为什么这么做、有什么取舍、遇到过什么坑"。** 5 年面试考的不是你会多少技术，而是你解决过多少问题。

---

> 文档生成时间：2026-06-27
