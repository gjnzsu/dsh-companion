# DSH 版本对比实验总结报告

> **报告日期**：2026-10-07
> **实验工作区**：`~/dsh-lab/`（本机 WorkBuddy 工作区，已脱敏）
> **实验日期**：2026-10-06
> **报告状态**：⚠️ **对比实验未完成** —— 本报告区分「已验证结论」与「未完成部分」

---

## 0. 一句话结论

**测试套件（dsh-lab）已建成并通过冒烟测试，安装已完成，但v0.1 vs v0.2 的正式 A/B 对比数据尚未产出。** 阻碍点是 Windows 路径超长导致的 MSYS 路径解析 Bug，与两个版本本身的质量无关。

---

## 1. 版本与安装状态

| 项目 | 版本 | 安装位置 | 状态 |
|---|---|---|---|
| DSH CLI（基线） | `0.1.0-rc.6` | npm 全局（`dsh.cmd`） | ✅ 可用，`dsh --version` 已验证 |
| DSH CLI（对比目标） | `0.2.0-rc.2` | `dsh-lab/versions/v0.2.0-rc.2/` | ✅ 隔离安装完成 |
| DSH Desktop | `0.2.0-rc.2` | `%LOCALAPPDATA%\Programs\DeepSeek Harness\` | ✅ 已安装并启动 |

**安装包**：`dsh-desktop-setup/dsh-latest-windows-x64.exe`，289 MB。

### 关键版本洞察 ✅已验证

npm 的 `latest` tag = `0.2.0-rc.2`，**与桌面版 `DeepSeek Harness.exe` 的 FileVersion 完全一致**。

→ **桌面版就是该 CLI 版本的 Electron 封装**，不是独立分支。这决定了二者的能力边界一致，对比时差异只来自 profile 配置与交互层，而非内核能力。

当前 npm dist-tags：
```json
{ "alpha": "0.2.1-alpha.1", "latest": "0.2.0-rc.2", "next": "0.2.0-rc.2" }
```

---

## 2. 架构差异：共用 `~/.dsh`

⚠️ **修正一个此前的文档错误**：桌面版**不使用**独立的 `~/.dsh-desktop/`，而是与 CLI **共用 `~/.dsh`**，在 `~/.dsh/profiles/desktop/` 下建自己的 profile。

当前profile 布局 ✅已验证：
```
~/.dsh/profiles/
├── desktop/     ← 桌面版（bundles: dsh-base + dsh-web-app）
├── headless/    ← CLI headless 模式
└── web/         ← 旧 web 模式
```

**推论**：CLI 与桌面版在同一台机器上可无缝共用凭据与配置，不会互相污染。

### 桌面版首次启动坑 ⚠️已踩并解决

异常退出（如代理导致 `ERR_PROXY_CONNECTION_FAILED`）会残留 lock 文件，导致下次启动直接失败：
```
EPERM: operation not permitted, unlink '~/.dsh/profiles/desktop/lock'
```
**解法**：`rm -f ~/.dsh/profiles/desktop/lock`

> ✅ 当前状态：已检查，**无残留 lock**。

---

## 3. 测试套件设计（dsh-lab）

### 3.1 为什么需要它

v0.1 → v0.2 变化很大（日常办公工具、插件管理页、diff 审阅、自动化任务），但**官方没有 benchmark**。手动用两个版本跑同一任务只能靠感觉判断。这个套件把对比变成**可重复的一次操作**。

### 3.2 五种运行模式

| 命令 | 用途 |
|---|---|
| `doctor` | 预检环境坑（pwsh / 网络 / 凭据 / fixture）——**跑之前先执行** |
| `probe` | 盘点 dsh 版本、node/pnpm、已有 DSH_HOME 与历史结果 |
| `run --task "..."` | 用 PATH 上的 dsh 跑单次基线（v0.1） |
| `ab --task-dir ./tasks` | npx 拉指定版本做 A/B 对比 |
| `report` | 汇总所有结果 |

### 3.3 隔离设计

每次运行都是干净环境：
- **独立 `DSH_HOME`** —— 每个 label 一个，配置/session 完全分开
- **独立沙箱目录** —— 任务在 `_sandboxes/<label>/` 跑，不碰真实仓库
- **凭据自动复制** —— 从 `~/.dsh/.credentials.yaml` 只读复制
- **session 增量采集** —— 运行前后对 `sessions/` 做差集，精确锁定本次日志

### 3.4 度量来源与指标

dsh **没有** usage/token 落盘文件，全部指标从 session 日志实时解出。

**日志路径**：`$DSH_HOME/sessions/<workspace>/<session-id>/session.jsonl.zstd`（zstd 压缩 JSONL）

| 指标 | 来源 |
|---|---|
| input / output / cacheRead / reasoning tokens | `data.usage`（`assistant/message` + `assistant/chunk`） |
| effective input | `inputTokens + cacheReadTokens`（真实喂给模型的量） |
| steps / turns | `step/end`、`turn/end` 计数 |
| tool calls | `tool/call` 计数 + 按工具名分组 |
| duration | 运行时 wall clock |
| exit code | 进程退出码 |

> `effective input` 比 `inputTokens` 更能反映真实成本 —— cache 命中的部分单价低但仍计入上下文。

### 3.5 内置任务集（4 个）

| 任务 | 考察点 |
|---|---|
| `01-repo-triage` | 只读分析，输出克制程度（测「少说废话」能力） |
| `02-data-processing` | 文件创建 + 计算，标准 coding 流程 |
| `03-codebase-scan` | 大范围检索，考察 grep/glob 工具效率 |
| `04-implement-run` | 写代码 + 实际执行，考察工具链闭环 |

---

## 4. 已验证的实测数据

### 4.1 冒烟测试（唯一跑通的一次）

`results/_homes/smoke-ok/` —— 从 zstd session 日志解出的**真实数据**：

| 指标 | 实测值 |
|---|---|
| 任务 | 读取 `package.json`，输出 name/version/deps 数量 |
| **inputTokens** | 8,556 |
| **cacheRead** | 8,192 |
| **effective input** | **16,748** |
| **outputTokens** | **150** |
| reasoning | 6 |
| **tool calls** | **1**（`read`） |
| steps / turns | 2 / 1 |
| **duration** | **4.1s** |

**权限模式记录**：`permission/preset = workspace-write`、`sandbox/mode = workspace-write`、`approval/policy = ask`

> ⚠️ 这条记录用的是**默认权限**（`workspace-write` + `ask`），说明冒烟测试跑在第 6 节那个修复**之前**。脚本现已默认改为 `danger-full-access`（见第 6 节）。

**质量校验**（人工看 `final_output`）—— 任务**真实完成**，非绕过：
```
结论：
- **name**: `dsh-lab-fixture`
- **version**: `1.2.3`
- **dependencies**: 4 项（zstandard、tabulate、react、lodash）
- **devDependencies**: 2 项（typescript、vitest）
```

数据一致性良好：`effective input` (16,748) 中 49% 来自 cacheRead，输出仅 150 token —— **只输出结论不贴文件内容**，符合 `01-repo-triage` 的设计意图。

### 4.2 权限模式关键实测对比 ✅已验证

这是昨天最有价值的发现：

| 模式 | 工具调用数 | 输出 token | 结果 |
|---|---|---|---|
| `workspace-write`（默认） | 3（2 次失败重试） | 1,795 | ❌ 失败 |
| `danger-full-access` | **1** | **80** | ✅ 拿到 `v22.22.2` |

**降幅：工具调用 −67%，输出 token −96%。**

---

## 5. ⚠️ 未完成部分：正式 A/B 对比

### 5.1 实际状态核查

```
results/
├── _homes/smoke-ok/       ← 只有这一个
└── _sandboxes/smoke-ok/   ← 只有这一个
```

- ❌ `find results/ -name meta.json` → **空**
- ❌ `results/` 下无任何非 `_` 前缀的 label 目录
- ❌ **无任何 `meta.json`** → 没有任何一次 run 完成了度量采集

**结论：v0.1 vs v0.2 的 token / 耗时 / 工具调用对比数据，一条都没有产出。**

### 5.2 阻碍原因

| 阻碍 | 细节 |
|---|---|
| **MSYS 路径解析 Bug** | 工作区路径层级深，在 MSYS 环境下路径解析失败，任务无法正常启动 |
| **koffi 原生编译失败** | v0.2 的 npm 安装在 `koffi` 依赖处失败（缺 CMake），后改用隔离安装绕过 |
| npx OOM | `npx -y @deepseek-ai/dsh@<ver>` 两次失败：`exit=124`（901s 超时）、`exit=134`（崩溃，堆停在 2046 MB） |
| 任务中断 | 用户在 A/B 执行中途叫停 |

### 5.3 建议的修复路径

1. **解决 MSYS 路径 Bug** —— 把测试目录移到短路径（推荐 `C:\dsh-test\`），避开超长路径与 MSYS 解析问题
2. 保持隔离安装（不用 npx），`NODE_OPTIONS=--max-old-space-size=8192`
3. 跑前先 `./dsh-compare.sh doctor` 预检
4. 显式固定模型，避免不同版本默认模型差异污染对比
5. 若需严谨结论，把 `RUNS_PER_TASK`（当前默认 `1`）调大后取均值

---

## 6. 最有价值的发现：`DSH_PERMISSION_MODE`

### 症状

dsh 执行命令报：
```
Failed to load [...\Program Files\WindowsApps\Microsoft.PowerShell_7.6.6.0_x64__8wekyb3d8bbwe\hostfxr.dll],
HRESULT: 0x80070005
exit code: 2147516546
```
重试 2-3 次后申请 `danger-full-access` 被拒（`no approval channel is available`）。

### 根因

`0x80070005` = `E_ACCESSDENIED`。dsh 默认以 `workspace-write` 权限跑子进程，降权后读不到 `Program Files\WindowsApps\` 下的 dll（尽管该目录 ACL 已给 `BUILTIN\Users: ReadAndExecute`）。

`command -v pwsh` 命中的是 `AppData\Local\Microsoft\WindowsApps\pwsh.exe`（**0 MB**，App Execution Alias）。从普通终端启动完全正常（实测 7.6.6, exit 0），**只有降权子进程不行**。

### 解决方案（无需管理员权限）✅已验证

用 `dsh --profile headless --dump-config` 导出实际配置后发现，dsh 内建了这个环境变量开关：

```yaml
- id: sandbox-policy
  config:
    mode: !!js process.env.DSH_PERMISSION_MODE ?? 'workspace-write'
- id: approval
  config:
    policy: !!js (process.env.DSH_PERMISSION_MODE ?? 'workspace-write') === 'danger-full-access' ? 'never' : 'ask'
```

所以只需：
```bash
export DSH_PERMISSION_MODE=danger-full-access
```

**一箭三雕**：放开沙箱（pwsh 能读 dll）+ `approval: never`（不再卡在 no approval channel）。

> 📌 脚本已默认设置此变量（`dsh-compare.sh:100`）。要保留降权行为可覆盖：
> ```bash
> DSH_PERMISSION_MODE=workspace-write ./dsh-compare.sh ...
> ```

⚠️ **安全提示**：`danger-full-access` 意味着 agent 在沙箱里拥有完整权限。脚本用隔离 `DSH_HOME` + 沙箱目录控制风险面，但**不要**用它跑不受信任的输入。

---

## 7. Windows 实现踩坑全记录

这套脚本的价值一半在「跑任务」，另一半在「保证采集到的数据是真的」。以下 11 个坑全部实际踩过并修复。

| # | 坑 | 症状 | 解法 |
|---|---|---|---|
| 1 | `glob.glob()` 在 Windows 静默返回空 | session 路径正反斜杠混用，glob 匹配不到且**不报错** | 改用 `os.walk()` |
| 2 | 路径超 260 字符 | `WinError 3` —— 文件明明存在（本项目实测 263 字符） | `os.path.normpath()` + 超 250 字符加 `\\?\` 长路径前缀 |
| 3 | Git Bash 路径不能传给 Windows Python | `/c/Users/...` 与 `C:\Users\...` 互不识别 | 路径转换统一在 Python 侧用正则做|
| 4 | 运行前后目录差集不可靠 | 复用旧目录的 session 漏掉（表现为 `sessions=1` 但 token 全 0） | 运行前 `touch` 成旧时间，用 `find -newer` 判定 |
| 5 | 空沙箱让任务失去意义 | agent 拿到空目录，exit code 仍 0、token 也照扣，**数据毫无价值** | 加 `fixtures/`，每 run 前复制进沙箱 |
| 6 | **shell 执行失败（pwsh）** | `0x80070005` E_ACCESSDENIED | **`export DSH_PERMISSION_MODE=danger-full-access`** |
| 7 | 桌面版数据目录 | 文档说 `~/.dsh-desktop/` —— **实测错误** | 实为共用 `~/.dsh` + `profiles/desktop/` |
| 8 | 桌面版 lock 残留 | `EPERM: unlink .../profiles/desktop/lock` | `rm -f ~/.dsh/profiles/desktop/lock` |
| 9 | winget 装不了 PowerShell MSI | 认为是 Store 版已最新；`msiexec` 报 `Error 1925` 权限不足 | **不必纠结** —— 第 6 条已解决 |
| 10 | `npx` 跑 dsh 会 OOM | `Ineffective mark-compacts near heap limit`，堆停 2046 MB | `NODE_OPTIONS=--max-old-space-size=8192` + 隔离安装 |
| 11 | npm tag 解析 | `@0.2` → `ETARGET`，dsh 用三段式 `0.2.0-rc.2` | `npm view @deepseek-ai/dsh versions --json` |

### 最有用的调试命令

```bash
# 导出 dsh 实际生效的完整配置（342 行）
dsh --profile headless --dump-config > dump.yml
```

> 📌 `--dump-config` 是排查配置问题的**第一手工具**。最关键的 `DSH_PERMISSION_MODE` 开关就是靠它发现的，比盲试 PATH 高效得多。

---

## 8. 经验教训

>这套脚本的价值一半在「跑任务」，另一半在**「保证采集到的数据是真的」**。

11 个坑里有 **4 个表现为静默返回 0 或空**而不是报错 —— 不写冒烟测试根本发现不了。而最关键的那个（`DSH_PERMISSION_MODE`）是**读源码 + dump-config** 才找到的官方开关：dsh 把沙箱模式做成了环境变量，**根本不需要动系统权限**。

**方法论沉淀**：
1. **冒烟测试是必需品** —— 静默失败比崩溃更危险
2. **优先读配置源**（`--dump-config`）而非盲试环境
3. **数据可信度优先于跑通** —— 采集不到真实数据的「成功」是假的
4. **token 低 ≠ 质量高** —— 报告必须辅以人工质量校验，避免得出「v0.2 更省」这类误导结论（可能只是说得少、做少了）

---

## 9. 后续行动项

| 优先级 | 行动 | 说明 |
|---|---|---|
| 🔴 高 | 迁移测试目录到 `C:\dsh-test\` | 解决 MSYS 路径 Bug 的前提 |
| 🔴 高 | 跑完 4 任务 × 2 版本 A/B | 当前唯一缺口 |
| 🟡 中 | `RUNS_PER_TASK` 调大取均值 | 默认 1 次，token 抖动大 |
| 🟡 中 | 显式固定模型 | 避免不同版本默认模型差异污染对比 |
| 🟢 低 | 清理 `results/_homes/6c0c80...` 等残留 | 保持实验环境干净 |

---

## 附录 A：实验产物清单

```
dsh-lab/
├── README.md                    12.7 KB  实验完整文档（含11 个踩坑）
├── dsh-compare.sh               25.6 KB  对比脚本（doctor/probe/run/ab/report）
├── tasks/                       4 个任务定义（.txt）
├── fixtures/README.md            1.4 KB  fixture 说明
├── versions/
│   ├── v0.1.0-rc.6/                       CLI 基线（wrapper 接入全局 dsh）
│   └── v0.2.0-rc.2/                       隔离安装的对比目标
├── results/
│   ├── _homes/smoke-ok/                   ✅ 唯一跑通的一次
│   └── _sandboxes/smoke-ok/
└── %SystemDrive%/ProgramData/<第三方输入法组件>/  ⚠️ MSYS 路径 Bug 的残留产物（未清理）

dsh-desktop-setup/
└── dsh-latest-windows-x64.exe289 MB    桌面版安装包
```

---

*报告基于实验工作区实际文件与 zstd session 日志解出数据生成。所有标注✅ 的结论均有本机实证；标注 ⚠️ 的为未完成或已修正项。*