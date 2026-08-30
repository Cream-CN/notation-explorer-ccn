// PSS-Hydra.js - PSS Hydra Notation for NE-CCN
// Based on the definition: ψkH notation with expansion rules

(function() {
    // 注册到全局 register 数组
    if (typeof register === 'undefined') {
        console.error('PSS-Hydra: register not found. Make sure this script is loaded after framework.js');
        return;
    }

    // ==================== 解析和格式化 ====================

    // 解析 PSS Hydra 表达式为 AST
    // 格式: p0(p1(p0)+p0) 或 p0(p1)+p0
    function parsePSS(str) {
        str = str.trim();
        if (!str) return null;

        // 递归解析函数
        function parseExpr(index) {
            let results = [];
            while (index < str.length) {
                // 跳过空白
                while (index < str.length && str[index] === ' ') index++;
                if (index >= str.length) break;

                if (str[index] === 'p') {
                    // 解析 p 后面的数字
                    index++;
                    let numStart = index;
                    while (index < str.length && /\d/.test(str[index])) index++;
                    let num = parseInt(str.substring(numStart, index));
                    if (isNaN(num)) throw new Error('期望数字');

                    // 解析参数（括号内）
                    let args = [];
                    if (index < str.length && str[index] === '(') {
                        index++; // 跳过 '('
                        // 解析参数列表（用 + 分隔）
                        while (index < str.length && str[index] !== ')') {
                            // 跳过空白
                            while (index < str.length && str[index] === ' ') index++;
                            if (index >= str.length || str[index] === ')') break;

                            // 解析子表达式
                            let subResult = parseExpr(index);
                            if (subResult) {
                                args.push(subResult);
                                index = subResult._endIndex || index;
                            }

                            // 检查是否还有更多参数
                            while (index < str.length && str[index] === ' ') index++;
                            if (index < str.length && str[index] === '+') {
                                index++; // 跳过 '+'
                            } else {
                                break;
                            }
                        }
                        if (index < str.length && str[index] === ')') {
                            index++; // 跳过 ')'
                        }
                    }

                    // 创建节点
                    let node = {
                        type: 'p',
                        value: num,
                        args: args,
                        _endIndex: index
                    };
                    results.push(node);
                } else if (str[index] === ')') {
                    // 结束括号，返回当前结果
                    break;
                } else {
                    throw new Error('意外的字符: ' + str[index]);
                }
            }
            return results.length === 1 ? results[0] : results;
        }

        let result = parseExpr(0);
        if (Array.isArray(result) && result.length === 1) {
            return result[0];
        }
        return result;
    }

    // 将 AST 转换为字符串
    function stringifyPSS(node) {
        if (node === null || node === undefined) return '';
        if (Array.isArray(node)) {
            return node.map(n => stringifyPSS(n)).join('+');
        }
        if (typeof node === 'object' && node.type === 'p') {
            let argsStr = node.args.length > 0 ? '(' + node.args.map(a => stringifyPSS(a)).join('+') + ')' : '';
            return 'p' + node.value + argsStr;
        }
        return String(node);
    }

    // ==================== PSS Hydra 核心算法 ====================

    // 判断是否为 ψkH(0) 形式：p{k}(没有参数)
    function isPkZero(node) {
        if (!node || node.type !== 'p') return false;
        return node.args.length === 0;
    }

    // 判断是否为 ψkH(0) 形式，值为 1
    function isPkOne(node) {
        if (!node || node.type !== 'p') return false;
        if (node.args.length !== 1) return false;
        let arg = node.args[0];
        if (!arg || arg.type !== 'p') return false;
        return arg.value === 0 && arg.args.length === 0;
    }

    // 检查是否包含特定级别的 p
    function containsPk(node, k) {
        if (!node) return false;
        if (node.type === 'p' && node.value === k) return true;
        if (node.args) {
            for (let arg of node.args) {
                if (containsPk(arg, k)) return true;
            }
        }
        if (Array.isArray(node)) {
            for (let item of node) {
                if (containsPk(item, k)) return true;
            }
        }
        return false;
    }

    // 检查是否包含 ψkH(0) 作为子表达式
    function containsPkZero(node, k) {
        if (!node) return false;
        if (isPkZero(node) && node.value === k) return true;
        if (node.args) {
            for (let arg of node.args) {
                if (containsPkZero(arg, k)) return true;
            }
        }
        if (Array.isArray(node)) {
            for (let item of node) {
                if (containsPkZero(item, k)) return true;
            }
        }
        return false;
    }

    // 查找并替换 ψkH(0) 为 ψkH(ψkH(...))
    function expandPkZero(node, k, depth) {
        if (!node) return node;
        if (Array.isArray(node)) {
            return node.map(n => expandPkZero(n, k, depth));
        }
        if (node.type === 'p') {
            // 如果找到 ψkH(0)
            if (node.value === k && node.args.length === 0) {
                // 替换为 ψkH(ψkH(ψkH(...)))
                let result = { type: 'p', value: k, args: [] };
                let current = result;
                for (let i = 0; i < depth; i++) {
                    let next = { type: 'p', value: k, args: [] };
                    current.args = [next];
                    current = next;
                }
                // 最后一个 ψkH 的参数为空（即 0）
                return result;
            }
            // 递归处理参数
            if (node.args) {
                let newArgs = node.args.map(arg => expandPkZero(arg, k, depth));
                return { type: 'p', value: node.value, args: newArgs };
            }
        }
        return node;
    }

    // 查找最内层的 ψkH(0) 并展开
    function findAndExpandInnermost(node, k) {
        if (!node) return null;

        // 如果是数组，处理每个元素
        if (Array.isArray(node)) {
            let changed = false;
            let newNodes = node.map(n => {
                let result = findAndExpandInnermost(n, k);
                if (result !== n) changed = true;
                return result;
            });
            return changed ? newNodes : node;
        }

        // 如果是 p 节点
        if (node.type === 'p') {
            // 检查参数中是否有 ψkH(0)
            if (node.args) {
                for (let i = 0; i < node.args.length; i++) {
                    let arg = node.args[i];
                    // 如果参数是 ψkH(0)
                    if (isPkZero(arg) && arg.value === k) {
                        // 展开: ψkH(0) -> ψkH(ψkH(ψkH(...)))
                        // 使用 2 作为默认深度
                        let expanded = expandPkZero(arg, k, 2);
                        let newArgs = [...node.args];
                        newArgs[i] = expanded;
                        return { type: 'p', value: node.value, args: newArgs };
                    }
                    // 递归处理参数
                    if (arg && arg.type === 'p') {
                        let result = findAndExpandInnermost(arg, k);
                        if (result !== arg) {
                            let newArgs = [...node.args];
                            newArgs[i] = result;
                            return { type: 'p', value: node.value, args: newArgs };
                        }
                    }
                }
            }
            return node;
        }

        return node;
    }

    // ==================== 规则实现 ====================

    // 规则 (1): ψ1H(0) = 1
    // 返回表示 1 的序列

    // 规则 (2): #0(# + ψ1H(0)) = #0(#) + #0(#) + ...
    // 即展开形式为重复 #0(#)
    function expandRule2(node, n) {
        // 查找形式 #0(# + ψ1H(0))
        // 即某个 p 的参数中包含 ψ1H(0) 作为最后一个参数
        if (!node) return node;
        if (Array.isArray(node)) {
            return node.map(n => expandRule2(n, n));
        }
        if (node.type === 'p') {
            if (node.args && node.args.length > 0) {
                let lastArg = node.args[node.args.length - 1];
                // 检查最后一个参数是否为 ψ1H(0)
                if (isPkZero(lastArg) && lastArg.value === 1) {
                    // 提取 #0(#) 部分
                    let baseArgs = node.args.slice(0, -1);
                    // 构建 #0(#) 节点
                    let baseNode = { type: 'p', value: node.value, args: baseArgs };
                    // 重复 n 次
                    let result = [];
                    for (let i = 0; i < n; i++) {
                        // 深拷贝 baseNode
                        result.push(JSON.parse(JSON.stringify(baseNode)));
                    }
                    return result;
                }
                // 递归处理参数
                let newArgs = node.args.map(arg => expandRule2(arg, n));
                if (newArgs.some((arg, i) => arg !== node.args[i])) {
                    return { type: 'p', value: node.value, args: newArgs };
                }
            }
            return node;
        }
        return node;
    }

    // 规则 (3): #0(ψkH(#ψkH+1(0))) = #0(ψkH(#ψkH(#ψkH(#...))))
    function expandRule3(node, n) {
        if (!node) return node;
        if (Array.isArray(node)) {
            return node.map(n => expandRule3(n, n));
        }
        if (node.type === 'p') {
            if (node.args && node.args.length > 0) {
                let lastArg = node.args[node.args.length - 1];
                // 检查是否为 ψkH(#ψkH+1(0))
                if (lastArg && lastArg.type === 'p') {
                    let k = lastArg.value;
                    // 检查参数中是否包含 ψ{k+1}H(0)
                    if (lastArg.args && lastArg.args.length > 0) {
                        let innerLast = lastArg.args[lastArg.args.length - 1];
                        if (isPkZero(innerLast) && innerLast.value === k + 1) {
                            // 提取 # 部分（不含最后一个参数）
                            let prefixArgs = lastArg.args.slice(0, -1);
                            // 构建 ψkH(#ψkH(ψkH(...)))
                            let resultArgs = [...prefixArgs];
                            // 构建嵌套的 ψkH
                            let nested = null;
                            for (let i = 0; i < n; i++) {
                                let newNested = { type: 'p', value: k, args: nested ? [nested] : [] };
                                nested = newNested;
                            }
                            // 如果 prefixArgs 不为空，需要将嵌套作为最后一个参数
                            if (prefixArgs.length > 0) {
                                resultArgs.push(nested);
                            } else {
                                resultArgs = [nested];
                            }
                            let newLastArg = { type: 'p', value: k, args: resultArgs };
                            let newArgs = [...node.args];
                            newArgs[newArgs.length - 1] = newLastArg;
                            return { type: 'p', value: node.value, args: newArgs };
                        }
                    }
                }
                // 递归处理参数
                let newArgs = node.args.map(arg => expandRule3(arg, n));
                if (newArgs.some((arg, i) => arg !== node.args[i])) {
                    return { type: 'p', value: node.value, args: newArgs };
                }
            }
            return node;
        }
        return node;
    }

    // ==================== 主展开函数 ====================

    function expandPSSHydra(expr, n) {
        try {
            // 解析表达式
            let ast = parsePSS(expr);
            if (!ast) return expr;

            let times = Math.max(1, Math.floor(n));

            // 规则 (1): 如果是 ψ1H(0)，返回 1（用空序列表示）
            if (isPkZero(ast) && ast.value === 1) {
                return '1';
            }

            // 检查规则 (2): #0(# + ψ1H(0))
            let expanded2 = expandRule2(ast, times);
            if (expanded2 !== ast) {
                // 如果展开为数组，合并为一个表达式
                if (Array.isArray(expanded2)) {
                    return expanded2.map(n => stringifyPSS(n)).join('+');
                }
                return stringifyPSS(expanded2);
            }

            // 检查规则 (3): #0(ψkH(#ψkH+1(0)))
            let expanded3 = expandRule3(ast, times);
            if (expanded3 !== ast) {
                return stringifyPSS(expanded3);
            }

            // 如果以上规则都不适用，尝试查找并展开最内层的 ψkH(0)
            // 对于任意 k >= 1
            for (let k = 1; k <= 10; k++) {
                let result = findAndExpandInnermost(ast, k);
                if (result !== ast) {
                    return stringifyPSS(result);
                }
            }

            return expr;
        } catch (e) {
            console.warn('PSS-Hydra expansion failed:', e);
            return expr;
        }
    }

    // ==================== 判断是否为极限 ====================

    function isLimit(expr) {
        if (typeof expr !== 'string') return false;
        if (!expr || expr.trim() === '') return false;

        try {
            let ast = parsePSS(expr);
            if (!ast) return false;

            // ψ1H(0) 是 1，不是极限
            if (isPkZero(ast) && ast.value === 1) return false;

            // 检查是否包含可以展开的结构
            // 规则 (2): 包含 ψ1H(0) 作为参数
            // 规则 (3): 包含 ψ{k+1}H(0) 作为 ψkH 的参数
            // 或者包含 ψkH(0) 需要展开

            // 检查是否包含 ψ1H(0) 作为参数
            if (containsPkZero(ast, 1)) return true;

            // 检查是否包含 ψ{k+1}H(0) 作为 ψkH 的参数
            for (let k = 1; k <= 9; k++) {
                if (containsPkZero(ast, k + 1)) return true;
            }

            // 检查是否包含 ψkH(0) 需要展开
            for (let k = 1; k <= 10; k++) {
                if (containsPkZero(ast, k)) return true;
            }

            return false;
        } catch (e) {
            return false;
        }
    }

    // ==================== 比较函数 ====================

    // 简化比较：按字符串字典序比较
    function comparePSS(a, b) {
        if (a === b) return 0;
        if (a === 'Infinity' || a === Infinity) return 1;
        if (b === 'Infinity' || b === Infinity) return -1;

        // 尝试解析并比较
        try {
            let aAst = parsePSS(a);
            let bAst = parsePSS(b);
            if (!aAst && !bAst) return 0;
            if (!aAst) return -1;
            if (!bAst) return 1;

            // 简单比较：按字符串
            let aStr = stringifyPSS(aAst);
            let bStr = stringifyPSS(bAst);
            if (aStr === bStr) return 0;
            return aStr < bStr ? -1 : 1;
        } catch (e) {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        }
    }

    // ==================== PSS-Hydra 注册 ====================

    register.push({
        id: 'pss-hydra',
        name: 'PSS Hydra',

        // display: 将表达式转换为HTML显示
        display: function(expr) {
            if (expr === null || expr === undefined) return '';
            if (expr === 'Infinity' || expr === Infinity) return '∞';

            if (typeof expr === 'string') {
                // 尝试格式化
                try {
                    let ast = parsePSS(expr);
                    if (ast) {
                        // 美化显示：将 p 替换为 ψ
                        let str = stringifyPSS(ast);
                        return str.replace(/p/g, 'ψ');
                    }
                } catch (e) {}
                return expr;
            }

            return String(expr);
        },

        // able: 判断是否为极限序数
        able: function(expr) {
            if (expr === 'Infinity' || expr === Infinity) return true;
            if (typeof expr !== 'string') return false;
            return isLimit(expr);
        },

        // compare: 比较两个表达式
        compare: function(a, b) {
            if (a === 'Infinity' || a === Infinity) {
                return (b === 'Infinity' || b === Infinity) ? 0 : 1;
            }
            if (b === 'Infinity' || b === Infinity) {
                return -1;
            }

            if (typeof a !== 'string' || typeof b !== 'string') {
                if (a === b) return 0;
                return String(a) < String(b) ? -1 : 1;
            }

            return comparePSS(a, b);
        },

        // FS: 基本序列展开
        FS: function(expr, n) {
            if (expr === 'Infinity' || expr === Infinity) {
                // 返回 ψ1H(0) 的序列作为 Infinity 的基本序列
                return 'p1(0)';
            }

            if (typeof expr !== 'string') return expr;
            if (!expr || expr.trim() === '') return expr;
            if (!this.able(expr)) return expr;

            let times = Math.max(1, Math.floor(n));
            try {
                return expandPSSHydra(expr, times);
            } catch (e) {
                console.warn('PSS-Hydra expansion failed:', e);
                return expr;
            }
        },

        // FSalter: 替代展开方式（Shift+点击）
        FSalter: function(expr, n) {
            // 使用不同的展开深度
            return this.FS(expr, n + 2);
        },

        // init: 初始化根节点
        init: function() {
            return [
                {
                    expr: Infinity,
                    low: ['p1(0)'],
                    subitems: []
                },
                {
                    expr: '0',
                    low: ['0'],
                    subitems: []
                },
                {
                    expr: 'p1(0)',
                    low: ['0'],
                    subitems: []
                },
                {
                    expr: 'p1(p0)',
                    low: ['p1(0)'],
                    subitems: []
                }
            ];
        },

        // semiable: 判断是否为半极限
        semiable: function(expr) {
            return false;
        }
    });

    console.log('PSS-Hydra notation registered successfully!');

})();