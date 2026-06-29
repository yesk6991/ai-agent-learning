# 简历项目经历

---

## 项目一：薪酬福利微前端平台（C&B Platform）

### 项目描述

企业内部薪酬福利管理平台，覆盖年度激励、异地派遣、绩效管理、薪资核算、数据分析等核心业务。采用 single-spa 微前端架构，将平台拆分为 21 个独立子应用，由 Shell 宿主应用统一加载，支撑公司数万名员工的薪酬流程全生命周期管理。

### 技术栈

React · Redux · single-spa · SystemJS · Formily · Ant Design · react-dnd · Webpack · ahooks · ECharts · Omega 埋点

### 项目亮点

#### 1. 基于 single-spa 的微前端架构落地

21 个子应用统一采用 single-spa + SystemJS 方案，通过 webpack `externals` 将 React/antd/axios 等框架级依赖外部化，由 Shell 宿主统一加载，保证全局单例。子应用独立开发、独立部署，改一个不需要重新构建全部。

**面试官可能会问：**

- **为什么选 single-spa 而不是 qiankun 或 Module Federation？各自优缺点？**

  > **single-spa** 是微前端底层库，提供生命周期编排（bootstrap/mount/unmount），但不提供沙箱和样式隔离，需要自己实现。优点是灵活可控、无魔法、包体小（~8KB），适合对隔离有定制需求的团队。缺点是配置繁琐，需要自己处理样式隔离和 JS 沙箱。
  >
  > **qiankun** 基于 single-spa 封装，增加了 HTML Entry（子应用只需一个 URL）、JS 沙箱（Proxy 沙箱 / Snapshot 沙箱）、样式隔离（Shadow DOM / scoped CSS）。优点是开箱即用、接入成本低。缺点是沙箱机制有兼容性坑（如 Proxy 沙箱下 `window.document` 访问问题），调试困难，定制性差。我们团队技术成熟，更倾向于掌控细节而非依赖黑盒，所以选了 single-spa。
  >
  > **Module Federation** 是 Webpack 5 的模块共享方案，不是完整的微前端方案。它解决了共享依赖和运行时加载的问题，但不提供生命周期管理、沙箱、样式隔离。适合"模块级"共享（如组件库远程加载），不适合"应用级"独立开发部署。而且我们当时还在 Webpack 4，升级成本高。
  >
  > 总结：选 single-spa 是因为（1）团队有能力处理隔离细节，（2）不想依赖 qiankun 的黑盒沙箱，（3）Module Federation 不满足应用级隔离需求且需要升级 Webpack 5。

- **共享依赖的版本不一致怎么办？升级共享库时怎么保证兼容？**

  > **版本不一致的应对：**
  > - 共享依赖统一在 Shell 的 `importmap` 中声明版本，所有子应用通过 `externals` 引用，不存在各子应用版本不一致的问题——因为是全局单例。
  > - 子应用的 `package.json` 中仍然声明该依赖，但 `devDependencies` 和实际运行时不同：dev 时用自己的版本，生产环境走 Shell 的版本。
  > - 开发阶段子应用可以独立运行（使用本地版本），生产环境由 Shell 控制，所以需要在子应用的单元测试 / 集成测试中覆盖生产版本的兼容性。
  >
  > **升级共享库的策略：**
  > - 升级是全量的：先在 Shell 中升级版本，然后逐个子应用验证并发布。因为 Shell 是统一入口，不存在 A 子应用用 React 17、B 子应用用 React 18 的情况。
  > - 对于 breaking change（如 antd 4→5 的样式迁移），我们在 Shell 中同时加载新旧两套样式，通过灰度发布逐步切换子应用。
  > - 实际操作中，共享库升级频率很低（React/antd 大版本一年最多一次），提前在测试环境全量回归即可。

- **子应用之间如何通信？Redux Store 怎么跨应用注入的？**

  > **通信方式：**
  > - **主通信方式：Redux Store 共享。** Shell 在启动时创建全局 Redux Store，通过 `CustomProps`（single-spa 的机制）将 Store 的 `dispatch`、`getState` 注入每个子应用。子应用通过 `dispatch` 更新全局状态，通过 `subscribe` 或 `connect` 响应状态变化。
  > - **辅助通信方式：Custom Events。** 对于非状态性的通知（如"刷新当前页数据"），使用 `window.dispatchEvent(new CustomEvent('refresh-data'))` 发布，子应用 `addEventListener` 监听。比 Redux 轻，不需要定义 action/reducer。
  > - **避免的方式：** 不用 localStorage / URL 参数做通信（时序不可控），不用 shared Module（增加耦合）。
  >
  > **Redux Store 跨应用注入的具体实现：**
  > ```js
  > // Shell 中
  > const store = createStore(rootReducer);
  > registerApplication({
  >   name: 'app-incentive',
  >   app: () => System.import('app-incentive'),
  >   activeWhen: '/incentive',
  >   customProps: { store }  // 注入 store
  > });
  >
  > // 子应用中
  > export function mount(props) {
  >   const { store } = props;
  >   // 子应用内部使用 store.dispatch / store.getState
  >   // 或传给子应用自己的 Provider
  > }
  > ```
  > - 子应用既可以访问全局 Store（用户信息、权限等），也可以有自己内部的局部 Store（业务数据），通过两层 Provider 嵌套实现。

- **`libraryTarget: 'system'` 是什么意思？SystemJS 的模块加载原理？**

  > **`libraryTarget: 'system'`** 是 Webpack 的 output 配置项，表示将打包产物输出为 SystemJS 模块格式。产物会被包裹成 `System.register([], function(exports, module) { ... })` 的形式，而不是传统的 IIFE 或 UMD。这样 SystemJS 运行时就能识别并加载这个模块。
  >
  > **SystemJS 的模块加载原理：**
  > 1. `System.import('app-incentive')` 触发加载。
  > 2. SystemJS 根据 `importmap` 解析模块名到 URL（如 `app-incentive` → `https://cdn.example.com/app-incentive/main.js`）。
  > 3. 通过 `<script>` 标签动态插入，下载并执行 JS。
  > 4. 执行时调用 `System.register()`，将模块的依赖声明和工厂函数注册到 SystemJS 的模块注册表中。
  > 5. 解析依赖：如果依赖（如 `react`）也在 importmap 中，递归加载；如果已经加载过（缓存命中），直接返回。
  > 6. 所有依赖就绪后，执行工厂函数，返回 `module.exports`。
  >
  > **和 ES Module 的区别：** SystemJS 是运行时模块加载器，可以在不支持 ESM 的浏览器上模拟 ESM 的 `import` 行为。它通过 `importmap` 实现了"裸导入"（bare specifier）的映射，这是浏览器原生 importmap 后来才标准化的能力。

- **微前端的样式隔离怎么做的？JS 沙箱呢？**

  > **样式隔离：**
  > - **CSS Modules / CSS-in-JS：** 子应用内部使用 CSS Modules 或 styled-components，类名自动哈希化，天然不会冲突。
  > - **命名约定：** antd 等全局样式的类名统一加前缀（如 antd 的 `prefixCls` 配置项设为子应用名），避免多个子应用的 antd 样式冲突。
  > - **加载/卸载隔离：** single-spa 的 `mount` 时动态插入子应用的 `<style>` 标签，`unmount` 时移除，保证卸载后样式不残留。
  > - **不加 Shadow DOM 的原因：** Shadow DOM 内部的弹窗、下拉框等绝对定位元素会脱离宿主流式布局，antd 的 Modal/Select 等组件需要挂载到 `document.body`，Shadow DOM 下无法正常工作，改造成本极高。
  >
  > **JS 沙箱：**
  > - single-spa 本身不提供 JS 沙箱（不像 qiankun 的 Proxy 沙箱）。
  > - 我们的策略是**约定而非隔离**：子应用不允许直接修改全局变量（`window` 上的属性），只能通过 Shell 注入的 `customProps` 访问共享资源。
  > - 子应用的 `unmount` 生命周期必须清理自己注册的全局监听器（`removeEventListener`、`clearInterval` 等），在 code review 中强制检查。
  > - 对于全局变量污染的风险，我们在 CI 中用 ESLint 规则禁止直接写 `window.xxx = ...`，必须走 Shell 提供的 API。
  > - 如果未来需要更强的隔离，可以引入 qiankun 的 ProxySandbox 或考虑 iframe 方案，但当前阶段约定 + review 已经足够。

---

#### 2. Formily 声明式表单引擎 + 闭包陷阱解决

异地派遣等业务表单字段多、联动复杂（变更类型驱动 10+ 字段可见性/可编辑性变化），采用 Formily v2 的 JSON Schema + `x-reactions` 实现声明式表单生成。但 Formily 的回调会捕获陈旧闭包，导致拿到旧的 state 值——通过 `useRef` 镜像 `useState` 解决，这是 Formily + React Hooks 的通用问题。

**面试官可能会问：**

- **Formily 的 `x-reactions` 是怎么实现字段联动的？和手动写 onChange 有什么区别？**

  > **`x-reactions` 的实现原理：**
  > - `x-reactions` 是 Formily 的声明式联动机制，支持两种写法：
  >   - **字符串路径写法：** `{ "x-reactions": [{ dependencies: ["changeType"], fulfill: { state: { visible: "{{$deps[0] === 'relocation'}}" } } }] }`，声明依赖字段，当依赖变化时自动执行 fulfill 逻辑更新当前字段状态。
  >   - **函数写法：** `{ "x-reactions": (field) => { field.visible = field.query('changeType').value() === 'relocation'; } }`，直接写回调函数，Formily 在依赖字段变化时调用。
  > - 底层原理：Formily 维护了一个响应式模型（基于自己实现的 `@formily/reactive`），类似 MobX。当字段 A 的值变化时，Formily 的 Tracker 自动追踪依赖链，触发依赖 A 的 reactions 重新执行，更新字段 B 的状态，进而触发 UI 重渲染。
  >
  > **和手动写 onChange 的区别：**
  > - **声明式 vs 命令式：** `x-reactions` 只需声明"当 X 变化时 Y 应该怎样"，Formily 自动处理触发时机和执行顺序。手动 onChange 需要在每个字段的 `onChange` 回调中命令式地更新其他字段，逻辑分散且容易遗漏。
  > - **依赖追踪：** `x-reactions` 自动追踪依赖，不会出现"忘了加 onChange"的情况。手动 onChange 容易漏掉某个联动。
  > - **多级联动：** A→B→C 三级联动，`x-reactions` 各自声明依赖即可自动链式触发。手动 onChange 需要在 A 的 onChange 中更新 B，B 的 onChange 中更新 C，且要处理时序。
  > - **缺点：** `x-reactions` 的调试体验较差，函数写法的闭包陷阱是个坑（后面会讲），字符串写法的表达式语言有限制。

- **useRef 镜像 useState 具体怎么写？为什么能解决闭包问题？**

  > **问题根因：** Formily 的 `x-reactions` 回调函数在创建时捕获了当时的 `useState` 值，形成闭包。后续 `setState` 更新了状态，但回调中引用的还是旧闭包中的旧值。
  >
  > **解决方案：**
  > ```js
  > const [formMode, setFormMode] = useState('view');
  > const formModeRef = useRef(formMode);
  > // 每次 render 后同步 ref
  > useEffect(() => { formModeRef.current = formMode; }, [formMode]);
  >
  > // 在 Formily 的 x-reactions 中使用 ref 而非 state
  > {
  >   "x-reactions": (field) => {
  >     // ❌ 错误：formMode 是闭包中的旧值
  >     // field.editable = formMode === 'edit';
  >
  >     // ✅ 正确：ref.current 始终是最新的
  >     field.editable = formModeRef.current === 'edit';
  >   }
  > }
  > ```
  >
  > **为什么能解决：** `useRef` 返回的是一个可变引用对象 `{ current: value }`，对象引用在组件生命周期内不变。闭包捕获的是 ref 对象的引用（不变），但通过 `.current` 访问的是最新值。而 `useState` 的值是每次 render 的新值，闭包捕获的是特定 render 时的快照值。
  >
  > 这个模式可以封装成自定义 Hook：
  > ```js
  > function useLatest(value) {
  >   const ref = useRef(value);
  >   ref.current = value; // 每次 render 同步更新，不需要 useEffect
  >   return ref;
  > }
  > ```
  > ahooks 的 `useLatest` 就是这个实现。注意这里直接赋值而不用 `useEffect` 是因为赋值发生在 render 阶段，保证在下次 effect 或回调执行前已更新。

- **React Hooks 闭包陷阱的根本原因是什么？除了 useRef 还有哪些解法？**

  > **根本原因：** React 函数组件的每次渲染都是一次函数调用，Hooks 的 state/value 是那次调用的局部变量。回调函数（如 `useEffect`、`setTimeout`、事件监听器）如果在创建时捕获了这些局部变量，就会形成闭包，引用的永远是那次渲染的值。后续重新渲染产生新的 state 值，但旧闭包中的引用不会更新。
  >
  > **典型场景：**
  > ```js
  > const [count, setCount] = useState(0);
  > useEffect(() => {
  >   const timer = setInterval(() => {
  >     console.log(count); // 永远打印 0
  >   }, 1000);
  >   return () => clearInterval(timer);
  > }, []); // 空依赖 → 闭包捕获初始 count = 0
  > ```
  >
  > **其他解法：**
  > 1. **正确设置依赖数组：** `useEffect(() => { ... }, [count])`，每次 count 变化重新创建回调。但 `setInterval` 场景不适用（会不断重建定时器）。
  > 2. **函数式更新：** `setCount(prev => prev + 1)`，不需要读取当前值，基于前一个值计算。适用于 state 更新场景。
  > 3. **useReducer：** dispatch 是稳定引用，不会变化，回调中用 dispatch 代替读取 state。
  > 4. **useRef（我们的方案）：** 可变引用，始终指向最新值。
  > 5. **ahooks 的 useLatest / useUpdateEffect：** 封装好的工具 Hook。

- **JSON Schema 驱动表单的优缺点？什么场景适合用、什么场景不适合？**

  > **优点：**
  > - **低代码/配置化：** 表单结构由 JSON 定义，可以存储在数据库、由后端动态下发，实现表单配置化。异地派遣的表单规则频繁变更，业务人员可以通过修改 JSON 配置而不需要前端改代码。
  > - **联动声明式：** `x-reactions` 让字段联动逻辑可读、可维护，比命令式的 onChange 链更清晰。
  > - **自动校验：** Schema 自带校验规则（required、pattern、min/max），不需要手动写校验逻辑。
  > - **可序列化：** JSON 可以传输、存储、diff、版本管理，比 JSX 更适合做表单模板。
  >
  > **缺点：**
  > - **调试困难：** JSON Schema 是数据结构，不是代码，断点、console.log 都不好用。联动逻辑写成了字符串表达式，报错信息不友好。
  > - **灵活性受限：** 复杂的 UI 交互（如拖拽排序、动态增删分组）用 Schema 描述很别扭，最终还是得写自定义组件（`x-component`），反而增加了 Schema + 组件的映射成本。
  > - **学习曲线：** Formily 的概念多（Field、ArrayField、ObjectField、Reaction、Effect、Path），新人上手慢。
  > - **闭包陷阱：** 函数式 reactions 的闭包问题（前面已述）。
  >
  > **适合场景：** 字段多（20+）、联动复杂（多字段联动/级联）、规则频繁变更、需要后端配置化驱动的表单。如薪酬核算表单、异地派遣申请。
  >
  > **不适合场景：** 交互简单（几个输入框）、高度定制化 UI（非表单型交互）、团队不熟悉 Formily 学习成本无法承担。

---

#### 3. 30+ 字段类型的行内可编辑表格 + 双重校验体系

自研 InlineEditTable 组件，支持金额/百分比/整数/选择/备注等 30+ 字段类型的行内编辑。设计了双重校验体系：前端校验阻止保存（必填/格式/范围），后端通过 `_RedText` 后缀字段返回警告仅展示不阻断。用 `hasFrontendError` 门控避免双重报错。

**面试官可能会问：**

- **EditableCell 的实现原理？per-row Form Context 是怎么设计的？**

  > **EditableCell 的原理：**
  > - 表格的每个单元格有两种模式：**展示模式**（纯文本）和**编辑模式**（输入控件）。点击单元格进入编辑模式，失焦或按 Enter 保存并切回展示模式。
  > - 实现方式：用 `useState` 管理 `editing` 状态，`editing ? <Input /> : <span>{value}</span>`。但在表格场景中，每行可能有 30+ 个可编辑单元格，不能每个都独立管理 state（性能差、校验分散）。
  >
  > **per-row Form Context 的设计：**
  > - 借鉴 antd Form List 的思路，**每行数据包在一个 Form 实例中**，通过 `Form.Provider` 或 `Form.useFormInstance()` 让行内的 EditableCell 共享同一个表单上下文。
  > - 每个 EditableCell 通过 `Form.Item` 注册到所在行的 Form 中，自动获得校验、联动、值收集的能力。
  > - 好处：行内校验互相独立（A 行报错不影响 B 行），单行保存时只校验当前行，全量保存时遍历所有行 Form 实例校验。
  > - ```jsx
  >   <TableRow>
  >     <Form form={rowForm}>  {/* 每行一个 Form */}
  >       {columns.map(col => (
  >         <Form.Item name={col.dataIndex} rules={col.rules}>
  >           <EditableCell type={col.type} />
  >         </Form.Item>
  >       ))}
  >     </Form>
  >   </TableRow>
  >   ```

- **双重校验为什么不用一套？前端校验和后端校验的职责边界怎么划分？**

  > **为什么不用一套：**
  > - 前端校验解决的是**格式正确性**：必填未填、金额不是数字、百分比超范围等。这些规则明确、不依赖后端数据，可以即时反馈，避免无效请求。
  > - 后端校验解决的是**业务合理性**：薪资超出职级范围、同月重复发放、跨系统数据冲突等。这些规则依赖数据库中的关联数据，前端无法独立判断。
  > - 如果只用后端校验：每次失焦都发请求，体验差、服务端压力大；如果只用前端校验：业务规则全部前端维护，和后端逻辑重复且容易不一致。
  >
  > **职责边界：**
  > | 层 | 职责 | 例子 | 阻断行为 |
  > |---|---|---|---|
  > | 前端校验 | 格式/完整性 | 必填、数字格式、范围 | 阻止保存 |
  > | 后端校验 | 业务合理性 | 薪资超限、重复发放 | 仅警告（RedText），不阻断 |
  >
  > - 后端校验不阻断是因为有些"异常"在业务上是允许的（如高管薪资可以超限，需要经理审批而非禁止），所以只提示让用户确认，而不是硬拦截。

- **`_RedText` 后缀字段的设计思路是什么？后端怎么知道哪些字段需要警告？**

  > **设计思路：**
  > - 后端在保存接口的响应中，除了返回常规字段（如 `baseSalary: 50000`），还返回校验警告字段，命名规则为 `{原字段名}_RedText`（如 `baseSalary_RedText: "超出职级薪资范围"`）。
  > - 前端在保存响应后，遍历响应数据，如果发现 `_RedText` 后缀的字段非空，就在对应单元格下方渲染红色警告文字，但不阻止后续操作。
  > - **为什么用后缀而不是独立字段：** 因为警告和原字段是 1:1 对应关系，后缀命名让前端可以直接通过字段名映射找到对应单元格，不需要额外的映射配置。
  >
  > **后端如何知道需要警告：**
  > - 后端保存时会执行一套业务规则校验逻辑（和前端校验是不同的规则集），如果某字段触发了规则，就在响应中附上对应的 `_RedText` 消息。
  > - 例如：后端校验 `baseSalary` 时查询职级表，发现 50000 超出 P7 的范围（30000-45000），就返回 `baseSalary_RedText: "P7 职级薪资范围为 30000-45000"`。
  > - 这套规则是后端维护的，前端只负责展示，不关心规则内容。

- **编辑后如何做到只刷新被编辑行而非全量？`__editRowKey` 的实现？**

  > **问题：** 保存一行后如果重新拉取全量数据再 `setState`，整个表格都会重新渲染，30+ 列 × 数百行 = 上万个单元格重渲染，卡顿明显。
  >
  > **`__editRowKey` 的实现：**
  > - 保存成功后，后端返回更新后的行数据。前端用行唯一标识（如 `employeeId`）在数据列表中找到对应行，替换该行数据：
  >   ```js
  >   const onRowSaved = (rowKey, newRowData) => {
  >     setTableData(prev => prev.map(row =>
  >       row[primaryKey] === rowKey ? { ...newRowData, __editRowKey: rowKey } : row
  >     ));
  >   };
  >   ```
  > - `__editRowKey` 是一个临时标记，标记刚保存的行，用于在渲染时给该行加一个高亮动画（如闪烁背景色），1-2 秒后清除。
  > - 配合 React 的 `key` 机制，只有数据变化的行会重新渲染（因为使用了 `row[primaryKey]` 作为 key，引用没变的行不会重渲染）。
  > - 进一步优化：使用 `React.memo` 包裹 TableRow 组件，浅比较每行的 props，未变更的行直接跳过渲染。

- **30+ 字段类型怎么管理？switch-case 还是配置化？怎么扩展新类型？**

  > **配置化管理：**
  > - 不是 switch-case，而是**字段类型注册表**模式：
  >   ```js
  >   const FIELD_TYPE_REGISTRY = {
  >     currency: { component: CurrencyInput, rules: currencyRules, formatter: formatCurrency },
  >     percent:  { component: PercentInput, rules: percentRules, formatter: formatPercent },
  >     integer:  { component: NumberInput, rules: integerRules, formatter: v => v },
  >     select:   { component: SelectInput, rules: [], formatter: v => v?.label },
  >     remark:   { component: TextArea, rules: [{ max: 200 }], formatter: v => v },
  >     // ... 30+ 类型
  >   };
  >   ```
  > - EditableCell 根据 `column.type` 从注册表中查找对应的组件、校验规则、格式化函数：
  >   ```js
  >   const config = FIELD_TYPE_REGISTRY[column.type];
  >   const EditComponent = config.component;
  >   ```
  >
  > **扩展新类型：** 只需在注册表中增加一条配置，不需要修改 EditableCell 的代码，符合开闭原则。
  >
  > **为什么不用 switch-case：** switch-case 每加一个类型就要改 EditableCell 组件，违反开闭原则，且 case 分支多了代码可读性差。注册表模式把每种类型的逻辑收拢到一处，组件本身只做分发。

---

#### 4. 动态表头 + 拖拽自定义列 + Schema 迁移

使用 react-dnd 实现表格列的用户自定义排序和显隐控制，配置持久化到 localStorage。后端动态返回列定义（含可编辑性、校验规则、hover 提示），前端合并用户自定义配置。设计了 `handleList` 静态方法处理 Schema 迁移：新版本加列自动补入、旧版本删列自动过滤，保证升级平滑。

**面试官可能会问：**

- **react-dnd 的拖拽排序原理？`useDrag`/`useDrop` 怎么配合？**

  > **核心原理：** react-dnd 基于 HTML5 Drag and Drop API 封装，通过发布-订阅模式连接拖拽源（Drag Source）和放置目标（Drop Target）。
  >
  > **`useDrag` / `useDrop` 的配合：**
  > - `useDrag`：让元素可拖拽。返回 `[{ isDragging }, dragRef]`，将 `dragRef` 绑到 DOM 元素上。拖拽时通过 `item` 传递数据（如列 ID 和当前索引）。
  > - `useDrop`：让元素可作为放置目标。返回 `[{ isOver }, dropRef]`，将 `dropRef` 绑到 DOM 元素上。在 `hover` 回调中检测拖拽位置，在 `drop` 回调中执行排序逻辑。
  > - 排序实现：当拖拽项 hover 到目标上方时，计算目标索引，将拖拽项从原位置移到目标位置（数组 splice 操作），实时更新列表顺序。
  >   ```js
  >   const [, dragRef] = useDrag({
  >     type: 'COLUMN',
  >     item: { index: colIndex },
  >   });
  >
  >   const [, dropRef] = useDrop({
  >     accept: 'COLUMN',
  >     hover: (dragItem, monitor) => {
  >       const dragIndex = dragItem.index;
  >       const hoverIndex = colIndex;
  >       if (dragIndex === hoverIndex) return;
  >       moveColumn(dragIndex, hoverIndex); // 更新列顺序
  >       dragItem.index = hoverIndex; // 更新拖拽项的索引
  >     },
  >   });
  >
  >   // 合并两个 ref
  >   return <div ref={(node) => { dragRef(dropRef(node)); }} />;
  >   ```

- **localStorage 存的列配置结构和后端返回的列定义怎么合并？冲突怎么办？**

  > **存储结构：**
  > ```js
  > // localStorage 中存储的格式
  > {
  >   "columnConfig_v2_incentive": {
  >     version: 2,          // 配置版本号
  >     order: ["name", "baseSalary", "bonus", "remark"],  // 用户自定义的列顺序
  >     hidden: ["id"],      // 用户隐藏的列
  >     updatedAt: 1700000000000
  >   }
  > }
  > ```
  >
  > **合并策略：**
  > 1. 后端返回的列定义是**全量权威列表**（包含所有可用列及其属性）。
  > 2. 前端以 localStorage 的 `order` 和 `hidden` 作为用户偏好，以**后端列表为基准**进行合并。
  > 3. 合并逻辑：
  >    - 先按 localStorage 的 `order` 排列（用户自定义顺序优先）。
  >    - 后端新增的列（localStorage 中没有的）追加到末尾。
  >    - localStorage 中有但后端没有的列（后端已删除）直接过滤掉。
  >    - `hidden` 中的列标记为隐藏但仍保留列定义（用户可以恢复显示）。
  >
  > **冲突处理：** 不存在真正的冲突。后端定义"有哪些列"，用户配置"列的顺序和显隐"，两者职责不同。唯一可能的问题是后端删除了某列但用户配置还在，通过 Schema 迁移处理（见下一问）。

- **Schema 迁移具体怎么做的？有没有遇到线上用户旧配置导致报错的情况？**

  > **Schema 迁移的 `handleList` 方法：**
  > ```js
  > static handleList(serverColumns, localConfig) {
  >   const serverKeys = new Set(serverColumns.map(c => c.key));
  >   const localOrder = localConfig?.order || [];
  >   const localHidden = new Set(localConfig?.hidden || []);
  >
  >   // 1. 过滤：localStorage 中有但后端已删除的列，直接丢弃
  >   const validLocalOrder = localOrder.filter(key => serverKeys.has(key));
  >
  >   // 2. 补入：后端新增的列，追加到末尾
  >   const localKeySet = new Set(validLocalOrder);
  >   const newColumns = serverColumns.filter(c => !localKeySet.has(c.key));
  >   const finalOrder = [...validLocalOrder, ...newColumns.map(c => c.key)];
  >
  >   // 3. 同步 hidden：同样过滤已删除的列
  >   const validHidden = [...localHidden].filter(key => serverKeys.has(key));
  >
  >   return { order: finalOrder, hidden: validHidden };
  > }
  > ```
  >
  > **遇到过的问题：** 早期版本没有做迁移，后端删除了一个字段（`oldBonus`），但用户 localStorage 中还有这个列的配置，渲染时找不到对应的列定义导致白屏。加上 `handleList` 后，自动过滤无效列，问题解决。
  >
  > **版本号机制：** localStorage 配置带 `version` 字段，如果后端返回的 Schema 版本号和本地不一致，可以触发全量重置（极端情况下的兜底方案）。

- **大量列（50+）的表格渲染性能怎么优化？虚拟滚动？**

  > **我们实际场景没有 50+ 列（最多 30+），但优化思路如下：**
  >
  > - **列维度：** 使用 CSS `overflow-x: auto` 横向滚动，而非虚拟化列。因为列虚拟化需要精确计算每列宽度和滚动位置，实现复杂且和行内编辑交互冲突（编辑中的 Input 可能被虚拟化卸载）。
  > - **行维度：** 使用 `react-window` 做行虚拟化，只渲染可视区域内的行。但行内编辑场景有个坑：编辑中的行不能被虚拟化卸载，否则输入状态丢失。解决方案是给编辑中的行加一个 `sticky` 标记，虚拟化时跳过。
  > - **单元格维度：** `React.memo` + 浅比较 props 避免无关单元格重渲染。配合 per-row Form Context，行内校验只触发当前行重渲染。
  > - **事件委托：** 30+ 列 × 100+ 行 = 3000+ 单元格，每个都绑定 onClick/onChange 会有性能问题。改用事件委托，在 `<table>` 上统一监听，通过 `data-row-key` 和 `data-col-key` 定位。
  > - **分页：** 后端分页，每页 50-100 行，避免前端一次渲染过多行。

---

#### 5. react-window 虚拟滚动表格 + 行内编辑状态保持

批量审批页面需同时渲染数百行 × 20+ 列的绩效数据，且部分单元格支持行内编辑。使用 react-window 的 `VariableSizeGrid` 替换 Antd Table 默认的 body 渲染器，只渲染可视区域内的单元格。解决了一个核心难点：虚拟滚动卸载了未渲染单元格的 Form 字段，导致 `actions.getFieldValue()` 返回 `undefined`——通过从原始数据源 `list` 中 fallback 取值解决。

**面试官可能会问：**

- **为什么选 react-window 而不是 react-virtualized？`VariableSizeGrid` 和 `FixedSizeList` 的区别？**

  > **选 react-window 的原因：**
  > - react-window 是 react-virtualized 的重构版，同一个作者（bvaughn），API 更简洁、包体更小（~6KB vs ~30KB gzip）、性能更好。
  > - react-virtualized 已经进入维护模式，不再增加新功能，react-window 是活跃维护的。
  >
  > **`VariableSizeGrid` vs `FixedSizeList`：**
  > - **`FixedSizeList`：** 一维列表，每项固定高度，适合简单列表场景（如聊天记录、通知列表）。
  > - **`VariableSizeGrid`：** 二维网格，每列可以有不同宽度，每行可以有不同高度，适合表格场景。
  > - 我们用 `VariableSizeGrid` 而不是 `FixedSizeList`，因为表格有多列且列宽不等（工号 100px、部门 200px、备注 300px 等），需要按列索引返回不同宽度。
  > - 行高统一 50px（固定），所以 `rowHeight` 直接返回常量。如果行高不固定（如有展开行），需要用函数根据 `rowIndex` 返回不同高度。

- **怎么把 react-window 和 Antd Table 结合的？`components.body` 的原理？**

  > **Antd Table 的 `components` prop：**
  > - Antd Table 支持通过 `components.body` 自定义表格 body 的渲染器，替换默认的 `<tbody>` 渲染逻辑。
  > - 传入一个函数时，Antd 会调用 `components.body(rawData, { scrollbarSize, ref, onScroll })`，把行数据和滚动信息传进来，由我们决定怎么渲染。
  >
  > **结合方式：**
  > ```jsx
  > const renderVirtualList = (rawData, { scrollbarSize, ref, onScroll }) => {
  >   ref.current = connectObject; // 注入滚动同步对象
  >   return (
  >     <Grid
  >       columnCount={mergedColumns.length}
  >       columnWidth={index => mergedColumns[index].width}
  >       rowCount={rawData.length}
  >       rowHeight={() => 50}
  >       onScroll={({ scrollLeft }) => onScroll({ scrollLeft })}
  >     >
  >       {({ columnIndex, rowIndex, style }) => (
  >         <div style={style}>
  >           {/* 渲染单元格内容 */}
  >         </div>
  >       )}
  >     </Grid>
  >   );
  > };
  >
  > <Table components={{ body: renderVirtualList }} />
  > ```
  > - Antd Table 的表头（`<thead>`）仍然由 Table 组件正常渲染，body 交给 `react-window` 的 Grid 渲染。
  > - 关键：表头的横向滚动需要和 body 同步。通过 `connectObject` + `Object.defineProperty` 拦截 Antd 表头的 `scrollLeft` 设置，转发给 `gridRef.current.scrollTo({ scrollLeft })`。

- **虚拟滚动卸载了未渲染的单元格，表单值丢失怎么办？这是怎么发现的？**

  > **问题现象：**
  > - 批量审批时，用户在表格中编辑了几行的绩效系数和备注，然后点"全部批准"，提交的数据中某些字段变成了空值——不是用户没填，而是 Formily 的 `actions.getFieldValue()` 返回了 `undefined`。
  >
  > **根因分析：**
  > - react-window 只渲染可视区域内的单元格，滚动出视口的单元格 DOM 会被卸载（包括 Formily 的 FormItem 组件）。
  > - Formily 的字段状态是和 DOM 挂载绑定的：组件 `mount` 时注册字段，`unmount` 时字段状态可能被清理或变为 inactive。滚动出视口后，`actions.getFieldValue('001.performFactor')` 返回 `undefined`，因为该字段已不在 Formily 的活跃字段树中。
  >
  > **解决方案：**
  > ```js
  > // 提交时，getFieldValue 返回 undefined 的字段从原始 list 中 fallback
  > const fieldVal = actions.getFieldValue(`${e.transactionNbr}.${ite}`);
  > e[ite] = fieldVal === undefined
  >   ? list.find(item => item.transactionNbr === e.transactionNbr)[ite] || ''
  >   : fieldVal;
  > ```
  > - 逻辑：如果 Formily 中能取到值（用户编辑过且还在视口内），用编辑后的值；如果取到 `undefined`（滚动走了或未编辑），从原始数据 `list` 中取值。
  > - 这样保证了两类数据都不丢：用户编辑过的字段取 Formily 的最新值，未编辑的字段取原始值。
  >
  > **更优解的思考：**
  > - 理想方案是用一个外部的 `Map<rowKey, Map<fieldKey, value>>` 维护所有编辑值，FormItem 的 `onChange` 更新 Map，提交时从 Map 读取。这样完全不依赖 Formily 的字段挂载状态。但当时项目时间紧，fallback 方案够用且改动最小。

- **`connectObject` 的 `Object.defineProperty` 是做什么的？为什么不直接用 ref？**

  > **问题背景：** Antd Table 的表头和 body 是两个独立的 DOM 区域。表头由 Antd 自己渲染，body 由 react-window 渲染。横向滚动时，两者需要同步——用户滚动表头时 body 要跟着滚，反之亦然。
  >
  > **Antd Table 的同步机制：** Antd 内部通过 `ref.current.scrollLeft = xxx` 来同步表头和 body 的滚动位置。
  >
  > **`connectObject` 的作用：**
  > ```js
  > const [connectObject] = useState(() => {
  >   const obj = {};
  >   Object.defineProperty(obj, 'scrollLeft', {
  >     get: () => null,
  >     set: scrollLeft => {
  >       if (gridRef.current) {
  >         gridRef.current.scrollTo({ scrollLeft });
  >       }
  >     },
  >   });
  >   return obj;
  > });
  > ```
  > - Antd Table 把 `ref.current` 当作一个 DOM 元素来操作 `scrollLeft`。但 react-window 的 Grid 不是原生 DOM，不能直接设 `scrollLeft`，只能通过 `gridRef.current.scrollTo()` API 控制滚动。
  > - `connectObject` 用 `Object.defineProperty` 拦截了 `scrollLeft` 的赋值操作，把它转换成 `gridRef.current.scrollTo({ scrollLeft })` 调用。
  > - 然后在 `renderVirtualList` 中：`ref.current = connectObject;`，让 Antd 以为它操作的是一个 DOM 元素，实际上操作的是我们的代理对象。
  >
  > **为什么不直接用 ref：** 因为 Antd 内部的代码是 `ref.current.scrollLeft = value`，而 react-window 的 Grid 组件不支持直接设置 `scrollLeft` 属性，只暴露 `scrollTo()` 方法。`connectObject` 是两者之间的适配器。

- **虚拟滚动表格和普通表格在键盘交互上有什么不同？Tab 键切换单元格怎么处理？**

  > **差异：**
  > - 普通表格：所有单元格都在 DOM 中，Tab 键按 DOM 顺序切换，浏览器原生支持。
  > - 虚拟滚动表格：只有可视区域的单元格在 DOM 中，Tab 切换到视口边缘时，下一个单元格还没渲染，焦点会"跳出"表格。
  >
  > **我们的处理：**
  > - 当前场景是审批页面，用户主要用鼠标点击编辑，Tab 交互不是高频场景，所以没有做 Tab 键的自动滚动跟随。
  > - 如果要做，思路是监听 `onKeyDown` 的 Tab 键，计算目标单元格的位置，调用 `gridRef.current.scrollTo({ scrollLeft, scrollTop })` 将目标单元格滚入视口，然后 `focus()` 目标 Input。
  >
  > **生产级方案参考：** AG Grid 和 Handsontable 等专业表格库内置了键盘导航 + 虚拟滚动的协同处理，但它们是商业级实现，代码量很大。对于我们的业务场景，鼠标交互为主，Tab 体验的优先级不高。

---

#### 6. CI/CD 全链路：构建 → 制品 → 部署 → 回滚

设计并实现 21 个子应用的自动化部署流程：`build.sh` 编译打包 → Artifactory 制品库归档 → `deploy.sh` 拉包部署。裸机部署通过 IP 检测环境，部署前备份当前版本（`dist.bak`），回滚只需一条 `mv` 命令，3 分钟内完成。

**面试官可能会问：**

- **构建和部署为什么要解耦？Artifactory 的作用是什么？**

  > **为什么要解耦：**
  > - 构建产出的制品（dist 目录的压缩包）是**不可变的**，同一个制品可以部署到测试环境验证、预发环境验证、生产环境发布。如果构建和部署耦合，每次部署都要重新构建，同一份代码可能因为依赖版本变化而构建出不同产物，无法保证"测的就是发的"。
  > - 解耦后，构建只需一次，制品带着版本号（如 `app-incentive-20240115-abc123.tar.gz`）归档到 Artifactory，部署只是"从制品库拉指定版本放到服务器上"。
  >
  > **Artifactory 的作用：**
  > - 制品版本管理：每次构建产出带 Git commit hash 和时间戳的版本号，可追溯。
  > - 制品留存：保留最近 N 个版本，回滚时直接拉旧版本，不需要重新构建。
  > - 环境隔离：测试/预发/生产环境从同一个 Artifactory 拉包，只是版本不同，保证环境一致性。

- **前端部署和后端部署的区别？前端回滚为什么比后端简单？**

  > **前端部署：** 本质是静态文件替换。把编译后的 HTML/CSS/JS 放到 Nginx 的静态资源目录即可，无状态，无数据库，无连接池。
  >
  > **后端部署：** 涉及数据库迁移、服务注册/注销、连接池切换、缓存预热、接口兼容性（新旧版本共存期间的请求路由）等有状态操作。
  >
  > **前端回滚简单的根本原因：** 前端无状态。回滚只需 `mv dist.bak dist`，Nginx 下一秒就服务旧版本。后端回滚需要反向执行数据库迁移、重启服务、等健康检查通过，每一步都有失败风险。

- **微前端子应用独立部署时，怎么保证 Shell 和子应用的版本兼容？**

  > **核心策略：约定式兼容 + 灰度发布**
  > - Shell 和子应用之间有**契约**：Shell 提供的 `customProps`（Store、全局方法等）接口只能新增不能删除/修改签名，类似 API 的向后兼容原则。
  > - 子应用升级时，如果用了 Shell 新增的接口，需要确保 Shell 先于子应用发布（先升级 Shell，再升级子应用）。
  > - 共享依赖（React/antd）由 Shell 控制，子应用不会独立升级共享库版本，所以不存在 Shell 用 React 17、子应用用 React 18 的情况。
  > - 极端情况下的兜底：Shell 的 `importmap` 中可以指定子应用的版本范围，如果子应用 API 不兼容，Shell 拒绝加载（mount 失败）并降级提示。
  > - 实际操作中，因为我们是内部系统，发布节奏统一管控（周五统一切生产），兼容性问题很少出现。

- **构建速度怎么优化的？externals 外部化对产物体积的影响？**

  > **构建速度优化：**
  > - `externals` 外部化：React/antd/axios/moment 等大包不打入子应用产物，由 Shell 统一加载。子应用产物从 MB 级降到 KB 级，构建时间减少 50%+。
  > - Webpack `cache-loader` / `hard-source-webpack-plugin`：缓存编译结果，二次构建提速。
  > - `thread-loader`：Babel 编译多线程并行。
  > - DLL Plugin（早期方案）：预编译不常变化的依赖，后来用 externals 替代。
  >
  > **externals 对产物体积的影响：**
  > - 单个子应用产物：从 ~2MB 降到 ~200KB（去掉了 React/antd/moment 等大包）。
  > - Shell 首次加载：需要加载所有共享依赖 + Shell 代码，总体约 1.5MB（gzip 后 ~400KB）。
  > - 后续子应用切换：只加载子应用自身的 ~200KB，体验很快。
  > - 总体来看，externals 以 Shell 首次加载为代价换取了子应用构建速度和加载速度的提升，在微前端场景下是值得的。

- **如果线上出 Bug，从发现到回滚的完整流程是怎样的？**

  > 1. **发现：** ErrorBoundary 捕获错误 → IM 频道告警 → 值班同学看到。
  > 2. **确认：** 查看告警中的错误堆栈和用户信息，判断影响范围（是全部用户还是特定页面）。
  > 3. **决策：** 如果是子应用 Bug，只回滚该子应用；如果是 Shell Bug，回滚整个 Shell。
  > 4. **回滚操作：**
  >    ```bash
  >    # SSH 到生产服务器
  >    ssh prod-server
  >    # 回滚该子应用
  >    cd /data/apps/app-incentive
  >    mv dist dist-broken      # 移除当前版本
  >    mv dist.bak dist          # 恢复备份版本
  >    ```
  >    全程约 1-3 分钟。
  > 5. **验证：** 刷新页面确认恢复正常，查看 IM 告警是否停止。
  > 6. **修复：** 在开发环境定位并修复 Bug，走正常 CI/CD 流程发布新版本。
  > 7. **复盘：** 记录事故时间线、根因、修复方案，更新到团队知识库。

---

#### 7. ErrorBoundary + IM 告警 + 50+ 埋点的线上质量保障

运行时 ErrorBoundary 捕获错误后自动推送到企业 IM 频道，实现秒级告警。Omega 埋点体系覆盖 50+ 关键事件（审批操作、编辑行为、分析查看等），仅生产环境触发，自动附加时间戳/用户名/页面 URL。

**面试官可能会问：**

- **ErrorBoundary 能捕获哪些错误？哪些捕获不了？**

  > **能捕获的：**
  > - 子组件 render 阶段抛出的错误
  > - 生命周期方法（componentDidMount 等）中的错误
  > - 构造函数中的错误
  >
  > **捕获不了的：**
  > - 事件处理函数中的错误（onClick、onSubmit 等）——因为事件处理不在 React 的渲染流程中，ErrorBoundary 无法捕获。需要自己用 try-catch 或 `window.onerror` 处理。
  > - 异步代码中的错误（setTimeout、Promise、async/await）——同样不在 React 渲染流程中。
  > - 服务端渲染（SSR）中的错误——需要用 `componentDidCatch` 的服务端对应方案。
  > - ErrorBoundary 自身抛出的错误——只能由上层 ErrorBoundary 捕获。
  >
  > **我们的补充方案：**
  > - `window.addEventListener('error', ...)` 捕获未处理的同步错误和资源加载错误。
  > - `window.addEventListener('unhandledrejection', ...)` 捕获未处理的 Promise rejection。
  > - 事件处理函数中统一用 `try-catch` 包裹，catch 后手动上报到 IM。

- **埋点体系怎么设计的？事件粒度怎么划分？**

  > **设计分层：**
  > - **页面级（PV/UV）：** 每次进入页面自动上报，用 React Router 的 `useEffect` 监听路由变化触发。
  > - **操作级（关键行为）：** 用户的关键操作手动上报，如"提交审批"、"保存薪资数据"、"导出 Excel"。
  > - **曝光级（功能使用）：** 某个模块/区域是否被用户看到，用 Intersection Observer 检测。
  >
  > **事件粒度划分原则：**
  > - 只埋"业务有意义的动作"，不埋"技术细节"（如"按钮 hover"）。例如："提交年度激励审批"是业务动作，"点击按钮"不是。
  > - 同类操作合并：不同模块的"保存"操作用同一个事件名 + 模块参数区分，而不是每个模块一个事件。
  > - 事件命名规范：`{模块}_{动作}_{对象}`，如 `incentive_submit_approval`、`salary_edit_data`。
  >
  > **上报数据结构：**
  > ```js
  > {
  >   eventName: 'incentive_submit_approval',
  >   timestamp: Date.now(),
  >   userId: currentUser.empId,
  >   pageUrl: location.href,
  >   extra: { incentiveType: 'annual', amount: 50000 }
  > }
  > ```
  > 其中 `timestamp`、`userId`、`pageUrl` 由埋点 SDK 自动附加，`eventName` 和 `extra` 由业务代码传入。

- **埋点数据怎么用的？有没有基于埋点发现和优化过什么？**

  > **数据用途：**
  > - **功能使用率分析：** 发现"数据分析"模块的日活只有 5%，而"薪资查看"模块日活 80%，决定优化高频模块的加载速度（懒加载 + 预加载）。
  > - **操作漏斗分析：** 发现"异地派遣申请"从打开到提交的完成率只有 60%，定位到是"上传附件"步骤流失率高。优化附件上传的交互（增加拖拽上传、格式提示）后，完成率提升到 78%。
  > - **性能监控：** 埋点数据中发现"年度激励"页面的平均加载时间从 2s 涨到 5s，排查发现是后端接口变慢，推动后端加缓存。
  > - **线上问题定位：** 用户反馈"保存失败但没报错"，通过埋点发现保存接口返回了 500 但前端没有处理，补充了错误提示。

- **开发环境的错误监控和生产环境有什么不同？**

  > | 维度 | 开发环境 | 生产环境 |
  > |---|---|---|
  > | 错误展示 | 控制台 + 错误覆盖层（Overlay） | ErrorBoundary 降级 UI（友好的"出错了"提示） |
  > | 告警 | 无（开发者自己看控制台） | IM 频道秒级告警 |
  > | 埋点 | 不触发（通过环境变量控制） | 正常触发 |
  > | Source Map | 有，直接看源码 | 不部署到服务器（只在内部构建产物中保留，通过 Sentry/自建平台按需加载） |
  > | ErrorBoundary 行为 | 打印详细堆栈，不降级（方便调试） | 渲染降级 UI，静默上报 |
  >
  > **环境判断：** 通过 `process.env.NODE_ENV` 或 Vite 的 `import.meta.env.MODE` 区分，埋点 SDK 初始化时检查环境变量，非生产环境直接 return 不上报。

---

## 项目二：员工福利移动端 H5（Benefit Mobile）

### 项目描述

面向公司全体员工的福利移动端 H5 应用，运行于公司 App 的 WebView 内。提供福利浏览（全景/列表）、保险保障详情、健康体检预约、弹性自选、PDF 文档预览等功能，覆盖数万员工的日常福利查看和体检预约需求。

### 技术栈

React 18 · TypeScript · Vite 6 · Ant Design Mobile 5 · React Router v7 · pdfjs-dist · DOMPurify · react-zoom-pan-pinch · Axios · Omega

### 项目亮点

#### 1. PDF 渐进渲染 + 重试 + 取消机制

使用 pdfjs-dist 手动渲染 Canvas 实现 PDF 预览，支持滚动模式（全页展示）和单页模式（前后翻页）。实现了渐进渲染：首页渲染完成后立即移除 loading，剩余页面后台继续渲染。网络请求含 3 次梯度退避重试（1s/2s/3s），并用 AbortController 在组件卸载时取消未完成的请求，防止内存泄漏。

**面试官可能会问：**

- **为什么不用现成的 PDF 预览组件，而用 pdfjs-dist 手动渲染？**

  > **现成组件的问题：**
  > - `react-pdf`：基于 pdfjs-dist 封装，但它的渲染策略是全量渲染所有页面后才显示，不支持渐进渲染。在移动端网络慢时，用户要等所有页面加载完才能看到内容，体验差。
  > - `vue-pdf`/`pdf.js` viewer：是完整的 PDF 阅读器 UI，体积大（~1MB+），样式和我们 App 的设计规范不统一，定制困难。
  > - Google Docs Viewer / 微软 Office Online：需要外网访问，公司内网环境不可用。
  >
  > **手动渲染的优势：**
  > - 完全控制渲染策略（渐进渲染、优先首页）。
  > - 自定义 UI（符合 App 设计规范的单页/滚动切换）。
  > - 产物体积小（只用 pdfjs-dist 的核心解析能力，~300KB）。
  > - 可以精细控制内存（渲染后释放页面文档对象，只保留 Canvas）。

- **渐进渲染的实现原理？怎么判断首页渲染完成？**

  > **实现原理：**
  > ```js
  > const renderPDF = async (pdfDoc) => {
  >   const pages = pdfDoc.numPages;
  >   setTotalPages(pages);
  >   setShowLoading(true);
  >
  >   // 1. 先渲染第 1 页
  >   const firstPage = await pdfDoc.getPage(1);
  >   await renderPageToCanvas(firstPage, canvasRef0.current);
  >   setShowLoading(false);  // 首页渲染完成，移除 loading
  >
  >   // 2. 后台渲染剩余页面
  >   for (let i = 2; i <= pages; i++) {
  >     if (aborted) break;  // 检查是否已取消
  >     const page = await pdfDoc.getPage(i);
  >     await renderPageToCanvas(page, canvasRefs[i - 1]?.current);
  >     setRenderedPages(prev => [...prev, i]); // 逐页通知渲染完成
  >   }
  > };
  > ```
  >
  > **判断首页渲染完成：** 第 1 页的 `renderPageToCanvas` resolve 后，立即 `setShowLoading(false)` 移除全屏 loading。此时用户已经可以看到第 1 页内容并开始阅读，而 2~N 页在后台继续渲染，每渲染完一页通过 `setRenderedPages` 更新列表，触发对应页面的 Canvas 显示。
  >
  > **滚动模式：** 用 Intersection Observer 监听每页 Canvas 容器是否进入视口，进入视口时才触发该页的渲染（懒渲染），进一步优化首屏性能。

- **AbortController 怎么用的？哪些场景需要取消请求？**

  > ```js
  > const controller = new AbortController();
  >
  > // 发起请求时传入 signal
  > axios.get('/api/pdf/document', {
  >   params: { docId },
  >   signal: controller.signal,
  > });
  >
  > // 组件卸载时取消
  > useEffect(() => {
  >   return () => {
  >     controller.abort(); // 取消所有未完成的请求
  >   };
  > }, []);
  > ```
  >
  > **需要取消请求的场景：**
  > - **组件卸载：** 用户在 PDF 加载中离开页面（点击返回、关闭 WebView），如果不取消，回调中 `setState` 会报 "Can't perform a React state update on an unmounted component" 警告，且请求占用的网络和内存资源被浪费。
  > - **切换文档：** 用户快速切换不同的 PDF 文件，需要取消上一个文件的请求，避免旧请求的响应覆盖新请求。
  > - **重试超时：** 3 次重试后仍失败，主动 abort 并提示用户。
  >
  > **pdfjs-dist 中的取消：** pdfjs-dist 的 `getDocument()` 也支持 `AbortSignal`，取消后不会继续下载 PDF 数据，节省带宽。

- **梯度退避重试和固定间隔重试的区别？为什么选梯度退避？**

  > **固定间隔重试：** 每次重试间隔相同（如每次等 2s）。问题是在网络拥塞时，大量请求同时重试会加剧拥塞（Thundering Herd 问题）。
  >
  > **梯度退避重试（Exponential Backoff）：** 每次重试间隔递增（1s → 2s → 4s 或 1s → 2s → 3s）。好处是：
  > - 网络短暂抖动时快速重试（1s），恢复后立即成功。
  > - 网络持续故障时逐步增大间隔，避免加重服务器负担。
  > - 移动端网络不稳定（如进电梯、切换基站），梯度退避比固定间隔更合理。
  >
  > **我们的实现：** 1s/2s/3s 是线性退避（不是指数退避 1/2/4），因为指数退避在移动端等待时间太长（4s 后用户可能已经离开），3 次总共等 6s 已经是用户耐心的极限。
  >
  > ```js
  > const retryWithBackoff = async (fn, retries = 3, delays = [1000, 2000, 3000]) => {
  >   for (let i = 0; i < retries; i++) {
  >     try {
  >       return await fn();
  >     } catch (err) {
  >       if (i === retries - 1) throw err;
  >       await new Promise(r => setTimeout(r, delays[i]));
  >     }
  >   }
  > };
  > ```

- **移动端 PDF 的性能瓶颈在哪？怎么优化的？**

  > **性能瓶颈：**
  > - **内存：** 每个 PDF 页面渲染为 Canvas，一个 1920×1080 的 Canvas 占 ~8MB 内存（宽×高×4 字节 RGBA）。10 页 = 80MB，在低配 Android 设备上容易 OOM。
  > - **CPU：** pdfjs-dist 的页面解析和 Canvas 绘制是 CPU 密集操作，低端机上单页渲染可能需要 500ms+。
  > - **网络：** PDF 文件体积大（5-20MB），移动端 4G 网络下下载慢。
  >
  > **优化措施：**
  > - **渲染分辨率降低：** 使用 `devicePixelRatio` 的 0.75 倍而非 1 倍渲染（牺牲少量清晰度换取 44% 的内存节省）。
  > - **懒渲染：** 滚动模式只渲染视口内的页面，离开视口的页面释放 Canvas 上下文（`canvas.width = 0` 释放内存），再次进入视口时重新渲染。
  > - **分片加载：** 后端将 PDF 按页拆分，前端按需请求单页数据（range request），而非一次下载整个 PDF。
  > - **Web Worker：** pdfjs-dist 默认使用 Web Worker 解析 PDF，不阻塞主线程。我们确认了 Worker 配置正确，没有回退到主线程解析。
  > - **单页模式优先：** 默认使用单页翻页模式（一次只渲染 1 页），滚动模式作为可选项。

---

#### 2. 原生 WebView Bridge 适配

页面运行在公司 App 的 WebView 中，需要与原生 Android/iOS 双端桥接：获取设备语言、控制顶部导航栏显隐、关闭 WebView 等。手动维护 `historyStack` 管理页面回退逻辑，当 `window.history.length <= 1` 时调用原生 `close()` 关闭 WebView 而非回退。

**面试官可能会问：**

- **JS Bridge 的通信原理？Android 和 iOS 的调用方式有什么区别？**

  > **通信原理：** WebView 提供了 JS 和原生之间的双向通信通道。
  > - **JS → 原生：** JS 调用原生注入到 `window` 上的方法。
  > - **原生 → JS：** 原生调用 `webView.evaluateJavascript()` 执行 JS 代码。
  >
  > **Android 和 iOS 的区别：**
  >
  > | 维度 | Android | iOS |
  > |---|---|---|
  > | 注入方式 | `WebView.addJavascriptInterface(obj, "NativeBridge")` | `WKUserContentController.addScriptMessageHandler` |
  > | JS 调用方式 | `window.NativeBridge.close()` 直接调用 | `window.webkit.messageHandlers.NativeBridge.postMessage({action: 'close'})` 消息传递 |
  > | 返回值 | 可以同步返回（`addJavascriptInterface` 的方法可直接 return） | 只能异步回调（`postMessage` 无返回值，需要原生回调 JS 函数） |
  >
  > **统一封装：**
  > ```js
  > const bridge = {
  >   close() {
  >     if (isIOS) {
  >       window.webkit.messageHandlers.NativeBridge.postMessage({ action: 'close' });
  >     } else {
  >       window.NativeBridge?.close();
  >     }
  >   },
  >   getLanguage() {
  >     if (isIOS) {
  >       // 异步，需要回调
  >       return new Promise(resolve => {
  >         window.__langCallback = resolve;
  >         window.webkit.messageHandlers.NativeBridge.postMessage({ action: 'getLanguage', callback: '__langCallback' });
  >       });
  >     } else {
  >       return Promise.resolve(window.NativeBridge?.getLanguage());
  >     }
  >   }
  > };
  > ```

- **为什么需要手动维护 historyStack？浏览器的 history API 不够用吗？**

  > **不够用的原因：**
  > - 浏览器的 `window.history.length` 记录的是当前标签页的历史栈长度，但这个值在 WebView 中不可靠：
  >   - WebView 打开时 `history.length` 可能不为 1（如果 WebView 复用了之前的浏览器上下文）。
  >   - `history.length` 是只读的，无法清空或修改。
  >   - 原生端的"返回"按钮行为不受 `history` 控制——原生端监听的是物理返回键或导航栏返回按钮，它的回调中我们需要告诉原生"是关闭 WebView 还是后退"。
  >
  > - 在我们的场景中：H5 页面有 A→B→C 的导航，用户在 C 页面点返回应该回到 B，在 A 页面点返回应该关闭 WebView。但 `history.back()` 在 A 页面可能无效（history 栈只有一条），此时需要调用原生的 `close()` 关闭整个 WebView。
  >
  > **手动维护的 historyStack：**
  > ```js
  > const historyStack = useRef([]);
  >
  > // 每次路由变化时记录
  > useEffect(() => {
  >   return () => {
  >     historyStack.current.pop();
  >   };
  > }, [location.pathname]);
  >
  > // 每次进入新页面时 push
  > historyStack.current.push(location.pathname);
  >
  > // 返回按钮处理
  > const handleBack = () => {
  >   if (historyStack.current.length <= 1) {
  >     bridge.close(); // 关闭 WebView
  >   } else {
  >     navigate(-1);   // 浏览器后退
  >   }
  > };
  > ```

- **怎么保证 Bridge 方法调用时原生端已经准备好？**

  > **问题：** 页面加载后立即调用 Bridge 可能失败，因为原生端注入 JS Bridge 对象有延迟（尤其是 Android 的 `addJavascriptInterface` 在 `onPageFinished` 之后才生效）。
  >
  > **解决方案：**
  > ```js
  > const waitForBridge = (timeout = 3000) => {
  >   return new Promise((resolve, reject) => {
  >     // 1. 先检查是否已存在
  >     if (window.NativeBridge || window.webkit?.messageHandlers?.NativeBridge) {
  >       return resolve();
  >     }
  >     // 2. 轮询等待
  >     const start = Date.now();
  >     const timer = setInterval(() => {
  >       if (window.NativeBridge || window.webkit?.messageHandlers?.NativeBridge) {
  >         clearInterval(timer);
  //         resolve();
  //       }
  //       if (Date.now() - start > timeout) {
  //         clearInterval(timer);
  //         reject(new Error('Bridge timeout'));
  //       }
  //     }, 100);
  //   });
  // };
  > ```
  > - 也和原生端约定了：原生端在注入完成后触发一个自定义事件 `window.dispatchEvent(new Event('bridgeReady'))`，前端可以监听这个事件。
  > - 实际使用中，大多数 Bridge 调用是用户主动触发的（点返回、点关闭），此时 Bridge 早已就绪。只有页面初始化时需要获取设备语言等场景需要等待。

- **PC 端和移动端怎么做适配的？isPc 判断有什么坑？**

  > **适配策略：**
  > - 响应式布局：主要用 CSS Media Query + vw/vh 单位，少量用 JS 判断。
  > - 组件级适配：antd-mobile 的组件本身就是移动端优先的，PC 端会外层加一个 max-width 容器。
  >
  > **isPc 判断的坑：**
  > - `navigator.userAgent` 判断：很多平板的 UA 和 PC 一样（iPad 的 Safari 默认请求桌面网站），导致误判为 PC。
  > - `window.screen.width` 判断：横竖屏切换时值会变。
  > - `window.matchMedia('(hover: hover)')` 判断：检测是否支持 hover，比 UA 准确，但部分触屏笔记本也会返回 true。
  > - **我们的方案：** 综合判断——UA 检测 + `matchMedia` + `maxTouchPoints`，且优先检查是否在公司 App 的 WebView 内（通过 UA 中的自定义标识），如果是 WebView 则一定是移动端。
  > ```js
  > const isPc = () => {
  >   if (/CompanyApp/i.test(navigator.userAgent)) return false; // 公司 App 内一定是移动端
  >   if ('ontouchstart' in window && navigator.maxTouchPoints > 0) return false;
  >   return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  > };
  > ```

---

#### 3. sessionStorage 缓存 + TTL + 空数据校验

首页、福利页、个人页统一实现带 TTL 的缓存策略：写入时记录时间戳，读取时检查是否超过 3 分钟过期，同时校验缓存数据非空（如 `bannerList` 为空数组也视为无效），避免展示过期空状态。结合 StrictMode 防重复请求（`useRef` 布尔标记 `fetchedRef`）。

**面试官可能会问：**

- **为什么用 sessionStorage 而不是 localStorage 或内存缓存？**

  > | 方案 | 优点 | 缺点 | 适用场景 |
  > |---|---|---|---|
  > | **sessionStorage** | 跨页面共享、标签页关闭自动清除、5MB 容量 | 同源标签页不共享 | 当前场景最适合 |
  > | **localStorage** | 持久化、容量大（10MB+） | 需要手动清除、跨标签页共享可能导致数据不同步 | 用户设置、主题等长期数据 |
  > | **内存缓存（useState/useRef）** | 读取最快、无序列化开销 | 页面跳转后丢失、刷新后丢失 | 组件内临时数据 |
  >
  > **选 sessionStorage 的原因：**
  > - 福利数据是"会话级"的，用户关闭 App 后下次打开应该获取最新数据，不需要持久化到 localStorage。
  > - 内存缓存在 SPA 路由切换时可用，但 WebView 中用户可能刷新页面（下拉刷新或原生端触发 reload），内存缓存会丢失，sessionStorage 不受影响。
  > - localStorage 的问题是跨标签页共享，如果用户在两个标签页中操作（虽然我们场景少见），可能导致一个标签页的缓存被另一个的旧数据覆盖。sessionStorage 天然隔离。

- **TTL 3 分钟是怎么定的？有没有考虑接口数据变更后缓存不一致？**

  > **TTL 定为 3 分钟的依据：**
  > - 福利数据的更新频率：banner 活动图一般每天更新一次，保险/体检数据变更频率更低。3 分钟的 TTL 意味着用户在 App 内浏览期间基本不会看到过期数据。
  > - 用户使用时长：根据埋点数据，用户平均会话时长约 5-8 分钟，3 分钟的 TTL 意味着在一个会话中最多额外请求一次，平衡了实时性和请求量。
  >
  > **缓存不一致的处理：**
  > - **读时校验：** 每次读取缓存时检查 TTL，过期则重新请求。
  > - **写时更新：** 用户的变更操作（如预约体检）成功后，主动清除相关缓存，下次进入页面会拉取最新数据。
  > - **静默刷新（stale-while-revalidate）：** 对于非关键数据（如 banner），先展示缓存（即使接近过期），同时后台发请求更新缓存，下次进入时看到最新数据。这比"先清空再加载"的体验好——用户不会看到 loading 空白。
  > - **不强求绝对一致：** 福利数据不是交易数据，3 分钟的延迟在业务上完全可接受。

- **StrictMode 下为什么会重复请求？useRef 怎么解决的？**

  > **StrictMode 重复请求的原因：**
  > - React 18 的 StrictMode 在开发模式下会故意两次调用 `useEffect`（mount → unmount → mount），用于帮助发现副作用中的问题（如未清理的订阅、定时器）。
  > - 如果 `useEffect` 中直接发请求且没有防重复机制，StrictMode 下同一接口会被请求两次。
  >
  > **useRef 解决方案：**
  > ```js
  > const fetchedRef = useRef(false);
  >
  > useEffect(() => {
  >   if (fetchedRef.current) return; // 已请求过，跳过
  >   fetchedRef.current = true;
  >   fetchData();
  >   return () => {
  >     // 注意：不要在这里重置 fetchedRef.current = false
  >     // StrictMode 的 unmount → remount 不会导致实际重复请求
  >   };
  > }, []);
  > ```
  >
  > **为什么用 useRef 而不是 useState：**
  > - `useState` 的更新会触发重渲染，而 `fetchedRef` 只是用来控制是否发请求，不需要触发渲染。
  > - `useRef` 的值在组件整个生命周期内持久存在，不受 StrictMode 的 unmount/remount 影响（ref 对象引用不变）。
  >
  > **注意：** 这个方案只在开发模式（StrictMode）下有效。生产环境没有 StrictMode 的双重调用，不需要这个 ref。但加上也没有副作用，所以统一保留。

- **缓存失效后的刷新策略？是静默刷新还是先清空再加载？**

  > **取决于数据类型：**
  > - **关键数据（保险/体检）：** 先清空再加载。因为这些数据如果过期（如体检状态从"未预约"变为"已预约"），展示旧数据可能误导用户做出错误操作。加载期间展示骨架屏（Skeleton）。
  > - **辅助数据（Banner 活动图）：** 静默刷新。先展示缓存内容，后台请求更新，用户无感知。
  >
  > **实现：**
  > ```js
  > const useCacheFetch = (key, fetcher, options = {}) => {
  >   const { ttl = 180000, strategy = 'stale-while-revalidate' } = options;
  >   const [data, setData] = useState(() => readCache(key));
  >   const [loading, setLoading] = useState(!data);
  >
  >   useEffect(() => {
  >     if (data && !isExpired(key, ttl)) return; // 缓存未过期
  >
  >     if (strategy === 'clear-then-fetch' && isExpired(key, ttl)) {
  >       setData(null);
  >       setLoading(true);
  >     }
  >
  >     fetcher().then(newData => {
  >       setData(newData);
  >       writeCache(key, newData);
  >       setLoading(false);
  >     });
  >   }, []);
  >
  >   return { data, loading };
  > };
  > ```

---

#### 4. DOMPurify 防 XSS + 搜索关键词高亮

搜索结果中需要高亮匹配关键词，实现方式是将后端返回的文本用正则替换插入 `<mark>` 标签，再通过 `dangerouslySetInnerHTML` 渲染。在渲染前使用 DOMPurify 对 HTML 进行消毒，防止用户生成内容中的 XSS 攻击。

**面试官可能会问：**

- **DOMPurify 的工作原理？它过滤了哪些危险标签和属性？**

  > **工作原理：**
  > - DOMPurify 使用浏览器原生的 DOM 解析器（`DOMParser`）将 HTML 字符串解析为 DOM 树，然后遍历 DOM 节点，对照白名单（ALLOWED_TAGS / ALLOWED_ATTR）过滤：
  >   1. 解析 HTML → DOM 树
  >   2. 遍历每个节点，不在白名单的标签 → 删除节点（或保留其子文本）
  >   3. 遍历每个属性，不在白名单的属性 → 删除属性
  >   4. 检测危险模式（如 `javascript:` 协议、`on` 开头的事件属性、`data:` URI 中的 SVG）→ 删除
  >   5. 序列化 DOM 树 → 安全的 HTML 字符串
  >
  > **默认过滤的危险内容：**
  > - 危险标签：`<script>`、`<iframe>`、`<object>`、`<embed>`、`<form>`、`<input>`、`<base>`、`<link>`、`<meta>` 等
  > - 危险属性：所有 `on*` 事件属性（`onclick`、`onerror`、`onload` 等）、`href="javascript:..."`、`src="javascript:..."`、`formaction` 等
  > - SVG 中的 XSS 向量：`<svg onload="...">`、`<svg><animate onbegin="...">` 等
  >
  > **我们的使用：**
  > ```js
  > import DOMPurify from 'dompurify';
  > // 只允许 mark 和 span 标签（高亮需要的）
  > const clean = DOMPurify.sanitize(html, {
  >   ALLOWED_TAGS: ['mark', 'span', 'br'],
  >   ALLOWED_ATTR: ['class'],
  > });
  > ```

- **为什么不用纯文本替换 + CSS 高亮，而用 innerHTML？**

  > **纯文本替换方案的问题：**
  > - 后端返回的文本中可能已经包含 HTML 标签（如换行 `<br>`、加粗 `<b>`、链接 `<a>`），纯文本替换会把原始 HTML 标签也当作文本展示，丢失格式。
  > - 例如：后端返回 `"您的体检项目包含<br>血常规和<b>肝功能</b>"`，如果用 `textContent` 渲染，`<br>` 和 `<b>` 会原样显示。
  >
  > **用 innerHTML 的原因：**
  > - 需要同时保留原始 HTML 格式和插入高亮 `<mark>` 标签。只有 innerHTML 可以同时渲染已有 HTML 和新增标签。
  > - 但 innerHTML 有 XSS 风险，所以必须在渲染前用 DOMPurify 消毒。
  >
  > **有没有更安全的替代方案：**
  > - 如果后端返回的是纯文本（不含 HTML），可以用 React 组件拆分文本 + `<mark>` 高亮，完全避免 innerHTML。但我们的后端数据格式不确定，保守起见用 DOMPurify + innerHTML。

- **除了 DOMPurify，还有哪些防 XSS 的手段？**

  > **多层防御：**
  > 1. **输入层：** 后端对用户输入做 HTML encode（`<` → `&lt;`），从源头阻止 XSS 注入。但不能完全依赖后端，因为数据可能经过多个系统流转。
  > 2. **渲染层：**
  >    - React 默认对 `{}` 表达式中的值做 HTML 转义，不会执行 `<script>`。但 `dangerouslySetInnerHTML` 是例外，需要 DOMPurify。
  >    - 不用 `eval()`、`new Function()`、`document.write()`。
  > 3. **HTTP 层：** 设置 `Content-Security-Policy` 响应头，限制可执行的脚本来源：
  >    ```
  >    Content-Security-Policy: default-src 'self'; script-src 'self'
  >    ```
  > 4. **Cookie 层：** 敏感 Cookie 设置 `HttpOnly`（JS 无法读取）和 `SameSite=Strict`（防 CSRF）。
  > 5. **URL 层：** 不直接将 `location.hash` 或 `location.search` 插入 DOM，先做 URL decode + 校验。

- **`dangerouslySetInnerHTML` 还有哪些使用场景？有什么替代方案？**

  > **常见使用场景：**
  > - 富文本编辑器内容展示（如来自 CMS 的文章内容）
  > - 邮件模板渲染
  > - 搜索关键词高亮（我们的场景）
  > - 第三方嵌入（如广告代码、社交媒体插件）
  >
  > **替代方案：**
  > - **React 组件拆分：** 将文本按 HTML 标签边界拆分为 React 元素数组，用 `<span>`/`<mark>` 替代原始标签。适用于结构简单的场景。
  > - **lit-html / html-react-parser：** 将 HTML 字符串解析为 React 元素树，比 innerHTML 更安全（不直接操作 DOM）。
  > - **iframe sandbox：** 在沙箱 iframe 中渲染不可信 HTML，隔离执行环境。但通信复杂，移动端性能差。
  > - **服务端渲染：** 后端直接返回安全 HTML，前端直接展示。但增加了后端职责。

---

#### 5. Vite 迁移 + 旧设备兼容

项目从 Webpack 迁移到 Vite 6，利用 esbuild 预构建 + ESM 原生加载大幅提升开发体验。同时使用 `@vitejs/plugin-legacy` 生成兼容包，支持 Chrome >= 53 / Android 5.x 的旧设备 WebView，通过 `regenerator-runtime/runtime` polyfill 保证 async/await 等现代语法可用。

**面试官可能会问：**

- **Webpack 迁移到 Vite 的动力是什么？迁移过程中遇到过什么坑？**

  > **迁移动力：**
  > - **开发启动速度：** Webpack 冷启动 30s+（21 个子应用共享配置更慢），Vite 冷启动 < 2s（按需编译，不打包）。
  > - **热更新速度：** Webpack HMR 3-5s（需重新构建修改模块及其依赖链），Vite HMR < 200ms（只重新编译修改的模块，浏览器直接请求新模块）。
  > - **配置复杂度：** Webpack 配置 500+ 行（各种 loader/plugin 的配置和兼容），Vite 配置 50 行（开箱即用）。
  >
  > **迁移过程中的坑：**
  > - **CommonJS 依赖：** Vite 的预构建基于 ESM，但有些第三方包只提供 CJS 格式。Vite 会自动预构建转换，但有些包的 `module` 字段指向有问题的入口，需要手动在 `optimizeDeps.include` 中指定。
  > - **`require.context`：** Webpack 独有 API，Vite 用 `import.meta.glob` 替代。
  > - **环境变量：** Webpack 用 `process.env.XXX`，Vite 用 `import.meta.env.VITE_XXX`，需要全局替换。
  > - **`import.meta.url` 和 `__dirname`：** Vite 的 ESM 环境中不存在 `__dirname`，需要用 `fileURLToPath(import.meta.url)` 替代。
  > - **CSS Modules 行为差异：** Webpack 的 camelCase 自动转换（`foo-bar` → `styles.fooBar`），Vite 默认不做。需要配置 `css.modules.localsConvention: 'camelCase'`。

- **Vite 为什么快？esbuild 预构建和 ESM 原生加载的原理？**

  > **Vite 快的两个核心原因：**
  >
  > **1. 开发时不打包：**
  > - Webpack 开发模式也是先打包再服务（bundle-based dev server），项目越大打包越慢。
  > - Vite 开发时不打包，浏览器请求一个 URL，Vite 按需编译对应模块并返回（native ESM dev server）。首屏只编译入口及其直接依赖，其余模块按需加载。
  >
  > **2. esbuild 预构建：**
  > - 第三方依赖（node_modules）变化很少，Vite 用 esbuild 预先将它们打包成 ESM 格式缓存到 `.vite/deps/`。
  > - esbuild 用 Go 编写，比 JS 编写的 Webpack/Babel 快 10-100 倍。
  > - 预构建解决的问题：
  >   - CJS → ESM 转换（很多 npm 包只有 CJS 格式）
  >   - 减少模块数量（lodash 有 600+ 个小文件，预构建合并为一个）
  >   - 统一模块格式（浏览器只认 ESM）
  >
  > **ESM 原生加载的原理：**
  > ```html
  > <!-- Vite 开发时的 HTML -->
  > <script type="module" src="/src/main.jsx"></script>
  > ```
  > - 浏览器遇到 `type="module"` 的 `<script>` 标签，会发起 HTTP 请求获取 `/src/main.jsx`。
  > - Vite 拦截请求，即时编译 JSX → JS，返回 ESM 格式的代码。
  > - 浏览器解析 `import` 语句，继续发起子模块请求，Vite 逐个编译返回。
  > - 这是瀑布式加载，但因为每个模块编译极快（esbuild）且支持 HTTP 缓存，实际体验很快。

- **Legacy 插件是怎么实现旧设备兼容的？产物体积增加了多少？**

  > **`@vitejs/plugin-legacy` 的原理：**
  > 1. Vite 正常构建产出 ES2020+ 的现代 JS（`assets/index-abc123.js`）。
  > 2. Legacy 插件额外用 Babel + core-js 对同一份代码做一次降级编译，产出 ES5 兼容的 JS（`assets/index-abc123-legacy.js`）。
  > 3. HTML 中使用 `<script type="module">` 和 `<script nomodule>` 的双脚本模式：
  >    ```html
  >    <script type="module" src="/assets/index-abc123.js"></script>
  >    <script nomodule src="/assets/index-abc123-legacy.js"></script>
  >    ```
  > 4. 现代浏览器执行 `type="module"` 的脚本，忽略 `nomodule`。旧浏览器不识别 `type="module"`，执行 `nomodule` 的降级脚本。
  >
  > **产物体积增加：**
  > - 现代 JS：~150KB（gzip ~50KB）
  > - Legacy JS：~250KB（gzip ~80KB），增加了约 60-70%
  > - 但旧设备只会加载 Legacy 版本，现代浏览器只会加载现代版本，不会重复加载。
  > - 加上 `core-js` polyfill（~30KB gzip），总体积增加可接受。

- **开发环境和生产环境的构建工具有什么区别？**

  > | 维度 | 开发环境 | 生产环境 |
  > |---|---|---|
  > | 构建工具 | Vite（原生 ESM 按需编译） | Rollup（预配置的完整打包） |
  > | 是否打包 | 否（浏览器按需请求模块） | 是（Tree-shaking + 代码分割 + 压缩） |
  > | 编译工具 | esbuild（JSX/TS 转换） | esbuild（JSX/TS）+ Babel（Legacy 降级） |
  > | HMR | 支持（极快） | 不需要 |
  > | Source Map | 行级（快速定位） | 隐藏（不部署到生产，按需从构建产物加载） |
  > | 产物优化 | 无（不压缩、不 Tree-shake） | 有（Terser 压缩、CSS 压缩、资源哈希、分包） |
  > | Polyfill | 不需要（开发者用现代浏览器） | Legacy 插件按需注入 |

---

#### 6. 体检预约多级级联 + 模糊搜索

体检预约流程涉及 省→市→机构→登录URL 四级级联选择，每级选择重置下游选项。机构列表支持本地模糊搜索（匹配名称/地址/品牌），选择后跳转机构登录页。双数据源设计：URL 参数优先，缺省时从 sessionStorage 读取上次选择。

**面试官可能会问：**

- **级联选择的数据流怎么设计的？选择省份后怎么重置市和机构？**

  > **数据流设计：**
  > - 四级数据不是一次性加载的（数据量大且级联依赖），而是按级加载：
  >   - 省份列表：页面加载时请求
  >   - 市列表：选择省份后根据省份 ID 请求
  >   - 机构列表：选择市后根据市 ID 请求
  >   - 登录 URL：选择机构后根据机构 ID 获取
  >
  > **重置逻辑：**
  > ```js
  > const [province, setProvince] = useState('');
  > const [city, setCity] = useState('');
  > const [org, setOrg] = useState('');
  > const [cities, setCities] = useState([]);
  > const [orgs, setOrgs] = useState([]);
  >
  > const onProvinceChange = async (val) => {
  >   setProvince(val);
  >   setCity('');     // 重置市
  >   setOrg('');      // 重置机构
  >   setOrgs([]);     // 清空机构列表
  >   const data = await fetchCities(val);
  >   setCities(data); // 加载新市的列表
  > };
  >
  > const onCityChange = async (val) => {
  >   setCity(val);
  >   setOrg('');      // 重置机构
  >   const data = await fetchOrgs(province, val);
  >   setOrgs(data);   // 加载新机构列表
  > };
  > ```
  > - 关键点：**上游变化时，必须清空下游的值和列表**，否则会出现"选了北京市但机构列表还是上海市的机构"的 bug。

- **模糊搜索是前端过滤还是后端搜索？为什么这么选？**

  > **前端过滤。**
  >
  > **原因：**
  > - 机构列表数据量不大（单个城市通常 50-200 个机构），前端全量缓存后本地过滤性能完全够用，不需要额外请求。
  > - 搜索体验好：实时过滤，无网络延迟，打字即出结果。
  > - 减少服务端压力：不需要为每个城市的模糊搜索建搜索接口。
  >
  > **实现：**
  > ```js
  > const filterOrgs = (keyword) => {
  >   if (!keyword) return orgs;
  >   const lower = keyword.toLowerCase();
  >   return orgs.filter(org =>
  >     org.name.toLowerCase().includes(lower) ||
  >     org.address.toLowerCase().includes(lower) ||
  >     org.brand?.toLowerCase().includes(lower)
  >   );
  > };
  > ```
  >
  > **什么时候该用后端搜索：** 如果机构数量达到万级（如全国所有机构一次加载），前端过滤会有性能问题（主线程阻塞）。此时应该用后端分页搜索 + 防抖请求。但我们的场景是按城市加载，单个城市数据量小，前端过滤是最优解。

- **双数据源怎么保证一致性？URL 参数和 sessionStorage 冲突时以谁为准？**

  > **优先级规则：URL 参数 > sessionStorage > 默认值**
  >
  > **为什么 URL 参数优先：**
  > - URL 参数是"意图明确的"，表示用户通过特定入口（如推送通知、短信链接）进来，应该尊重入口参数。
  > - sessionStorage 是"上次的记忆"，可能已经过期（用户上次选择的是北京，这次想选上海）。
  >
  > **实现：**
  > ```js
  > const getInitialValue = (key) => {
  >   // 1. URL 参数优先
  >   const urlVal = searchParams.get(key);
  >   if (urlVal) return urlVal;
  >
  >   // 2. sessionStorage 次之
  >   const cached = readCache(key);
  >   if (cached) return cached;
  >
  >   // 3. 默认值
  >   return '';
  > };
  > ```
  >
  > **一致性保证：**
  > - 无论初始值来自哪个数据源，用户修改选择后都会同时更新 URL 参数和 sessionStorage，保持两者同步。
  > - URL 参数用的是 `history.replaceState`（不产生新的历史记录），避免回退时看到旧参数。
  > - 不存在真正的"冲突"——URL 参数只在页面首次加载时读取，之后用户操作会覆盖两者。

- **这类多步骤表单的状态管理怎么做的？为什么不用全局状态库？**

  > **状态管理方式：** 组件内 `useState` + URL 参数。
  >
  > **为什么不用 Redux/Zustand 等全局状态库：**
  > - **状态作用域小：** 体检预约的状态只在预约页面使用，离开页面就不需要了，不需要全局共享。
  > - **引入全局状态的成本：** 需要定义 action/reducer/selector，增加代码量和复杂度，收益却很小。
  > - **URL 参数是更好的"持久化"：** 级联选择的每一步都应该反映在 URL 上（如 `/appointment?province=110000&city=110100`），这样用户刷新页面可以恢复状态，分享链接别人也能直接看到对应选项。全局状态库做不到 URL 同步。
  > - **组件卸载即清除：** 使用组件内 state，离开预约页面状态自动清除，不需要手动 cleanup。
  >
  > **什么时候该用全局状态库：** 如果预约流程跨多个页面（如 A 页面选省市 → B 页面选机构 → C 页面填信息），且需要回退时保留之前的选择，那么全局状态 + sessionStorage 更合适。但我们的预约流程是单页面内的步骤切换，组件内 state 足够。

---

> 💡 **提示：** 面试时围绕亮点展开，每个亮点按 **"做了什么 → 为什么这么做 → 遇到什么问题 → 怎么解决的"** 四步讲，比直接罗列技术名词更有说服力。
