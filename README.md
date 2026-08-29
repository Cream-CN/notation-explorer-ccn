README FILE
FORK FORM hypcos/notation-explorer
CODE FORM hypcos/notation-explorer smilelee-lyx/notation-explorer projectcf/notation-explorer
NE(CREAM-CN)
用法同hypcos/notation-explorer
规范

展开全程函数间操作规范


本规范定义注册器（register）中每个表示法（notation）对象的接口契约，以及框架（framework.js）如何利用这些函数完成表达式树构建、基本序列展开和工具提示显示。遵循本规范可确保新表示法与UI及逻辑无缝协作。

注册器条目结构

每个表示法通过 register.push({ ... }) 注册，对象包含以下字段：
id（字符串，必填）：唯一标识符，也用作Vue组件名（id + '-list'）。
name（字符串，必填）：在标签页上显示的名称。
display（函数，必填）：将表达式转为HTML字符串（可含 <sup> 等标签）以便显示。
able（函数，必填）：判断表达式是否为极限序数（即需要展开）。
compare（函数，必填）：比较两个表达式的大小，返回 -1（小于）、0（等于）或 1（大于）。
FS（函数，必填）：基本序列展开函数，返回第 n 项（n 为非负整数）。
FSalter（函数，可选）：备用展开方式，签名同 FS，通常用于按住Shift键时。
init（函数，必填）：返回初始数据集（列表），用于构建根节点。
semiable（函数，可选）：判断表达式是否为半极限，仅在 expand_tier 中用于额外控制。
各函数的详细约定
2.1 display(expr) -> string
用途：将表达式渲染为可读的HTML字符串。
约定：
对于特殊值 Infinity（伪极限），通常显示为 'Limit'。
可包含HTML标签，但不应包含交互元素。
输出应稳定唯一，用于缓存键时需保证同一表达式始终输出相同字符串。
2.2 able(expr) -> boolean
用途：判断 expr 是否为极限（其基本序列无限递增，且 FS(expr,0) 小于 expr）。
约定：
返回 true 时，框架才允许展开该节点。
非极限（后继、0等）返回 false。
Infinity 通常视为极限，返回 true。
2.3 compare(a, b) -> -1 | 0 | 1
用途：全序比较两个表达式。
约定：
必须满足传递性和反对称性。
返回值 -1 表示 a < b，0 表示相等，1 表示 a > b。
Infinity 应被视作最大元素（比任何非无穷表达式都大）。
用于 FSbounded 中寻找第一个大于 low[0] 的 FS 项。
2.4 FS(expr, n) -> expr
用途：计算表达式 expr 的第 n 个基本序列元素（n 为非负整数）。
约定：
若 expr 不是极限（able 返回 false），行为未定义（不应被调用）。
必须满足基本序列性质：FS(expr, n) 严格小于 expr，且随 n 增大单调递增。
对于 Infinity，应返回其规范极限序列的第 n 项。
返回值类型必须与 init 中定义的类型一致，且可被 compare 比较。
框架通常按表达式字符串缓存结果，但实现者可自行管理内部缓存。
2.5 FSalter(expr, n) -> expr（可选）
用途：备用的基本序列展开，通常用于“完整展开”模式。
约定：
签名与 FS 完全相同。
当用户按住 Shift 键点击展开时，框架优先调用 FSalter（若存在）。
典型区别：FS 可能返回截断后的表达式（删除最后一个元素），FSalter 返回完整展开。
若未提供，则 FS 会被用于所有场景。
2.6 init() -> [ item, item, ... ]
用途：返回初始表达式列表，作为该表示法的根节点。
约定：
每个 item 是对象：{ expr, low, subitems }。
expr：表达式值。
low：数组（通常只使用 low[0]），用于 FSbounded 的下界，必须严格小于 expr。
subitems：初始为空数组，由框架动态填充。
列表按升序排列（依据 compare），通常包含 Infinity（极限）和 0（或最小元素）。
2.7 semiable(expr) -> boolean（可选）
用途：判断表达式是否为“半极限”。
约定：
若不提供，默认返回 false。
在 expand_tier 中，若 semiable(expr) 为 true，则即使 able 为 false，也可能执行一次展开（条件是 compare(FS(expr,0), low[0]) > 0）。
用于非极限但依然可做特殊展开的项。
展开流程（函数间协作）
框架的展开逻辑位于 framework.js 的 Vue 组件方法中。
3.1 用户交互触发
鼠标悬停：调用 recalculate，展示 FS 序列。
鼠标点击（按下）：调用 expand，根据当前 tier 和 extra_FS 生成子节点。
3.2 recalculate 流程
检查 able(expr)，若非极限则无操作。
确定使用的 FS 函数：若 event.shiftKey 且 FSalter 存在则用 FSalter，否则用 FS。
对 n = 0 到 FS_shown（UI控制值），计算 FS(expr, n)，通过 display 转为HTML显示在工具提示中。
3.3 expand 流程（核心）
框架执行一次展开，在 subitems 中插入新节点。
a) 扩展“额外”项（extra_FS）
若 extra_FS > 0，反复调用 FSbounded（见下文），将结果插入到 item.subitems 前端，并更新 item.low[0] 为最新项。
目的：在正式展开前，先推进到足够接近极限的项，减少层级数。
b) 分层展开（tier）
根据 tier 值（0~8等），递归执行 expand_tier：
若当前项可展开（able 为 true，或 semiable 允许），则调用 FSbounded 获得第一个“有意义”的展开项（即 compare(FS(expr, n), low[0]) > 0）。
生成新节点，插入当前项之后（或子项内，取决于层级）。
tier 递减，递归处理新节点（若 tier > 0）。
展开结果通过 display 显示在列表上。
3.4 FSbounded 辅助函数（框架内部）
FSbounded = function(FS, compare, seq, low) {
令 n = 0；
循环：res = FS(seq, n)；
若 compare(res, low[0]) > 0，则返回 res；
否则 n+1，继续循环。
}
作用：找到第一个大于 low[0] 的 FS 项，确保新展开项是“有意义”的最小项。
当 n 较小时可能返回等于或小于 low[0] 的值，函数自动递增 n 直至满足条件。
缓存与性能注意事项
框架不强制各函数缓存结果，但实现者可用内部数据结构（如 data 对象）存储已计算的 FS 序列，以提升反复访问性能。
FS 和 FSalter 应尽量为纯函数（相同输入返回相同输出），以便框架基于 display 字符串的缓存机制生效。
若表达式包含 Infinity，应保证 FS(Infinity, n) 返回与 init 中定义一致的极限序列。
初始化与项结构示例
init 返回的列表项结构示例：
   [
      { 
        expr: [[Infinity]], low: [[]], subitems: [] },
      { expr: [], low: [[]], subitems: [] }
   ]
expr：当前表达式（任意类型，但需被 display、compare、FS 等处理）。
low：数组，通常只用 low[0]，必须是严格小于 expr 的表达式。
subitems：框架动态填充的子项列表（递归结构）。
重要约束：所有表达式类型的比较必须通过 compare 函数，且 compare 必须与 display 产生的字符串一致（用于缓存键）。
错误处理与边界情况
若 able(expr) 为 true，但 FS 返回的项不小于 expr（违反基本序列性质），可能导致 FSbounded 死循环。实现者必须保证性质成立。
若 FSalter 未提供，框架将使用 FS 替代。
半极限（semiable）使用场景较特殊，实现者应仔细查阅表示法定义，仅在必要时提供。
开发新表示法检查清单
脚本应当放置在Notation目录下
确定数据类型：选择表达式内部表示（数组、数字、字符串等）。
实现 compare：确保全序且符合数学定义。
实现 display：输出清晰的HTML表示。
实现 able：正确识别极限。
实现 FS：计算基本序列；考虑是否需要 FSalter（若需要两种展开模式）。
实现 init：定义根节点（含极限、零等）。
可选实现 semiable：若表示法有半极限概念。
测试：验证 FS(expr, n) 单调递增且小于 expr，FSbounded 可终止。
注册：在 index.html 中引入新脚本文件。