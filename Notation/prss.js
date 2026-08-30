// PrSS.js - PrSS (Primitive Sequence System) Notation for NE-CCN
// Based on the definition: (1) () = 0, (2) (#,0) = (#)+1, (3) (#1, ai, #2, ak) expansion

(function() {
    // 注册到全局 register 数组
    if (typeof register === 'undefined') {
        console.error('PrSS: register not found. Make sure this script is loaded after framework.js');
        return;
    }

    // ==================== 核心工具函数 ====================

    // 解析序列字符串为数字数组
    // 支持格式: "0,1,2,3" 或 "0 1 2 3" 或 "(0)(1)(2)(3)"
    function parseSequence(str) {
        if (typeof str !== 'string') return [];
        str = str.trim();
        if (!str) return [];

        // 尝试解析为数字序列（逗号或空格分隔）
        let numbers = [];
        // 检查是否为括号格式: (0)(1)(2)
        if (str.startsWith('(') && str.endsWith(')')) {
            // 移除所有括号，然后按逗号或空格分割
            let cleaned = str.replace(/[()]/g, ' ');
            let parts = cleaned.trim().split(/[\s,]+/);
            for (let p of parts) {
                if (p !== '') {
                    let num = parseInt(p);
                    if (!isNaN(num)) numbers.push(num);
                }
            }
        } else {
            // 按逗号或空格分割
            let parts = str.split(/[\s,]+/);
            for (let p of parts) {
                if (p !== '') {
                    let num = parseInt(p);
                    if (!isNaN(num)) numbers.push(num);
                }
            }
        }
        return numbers;
    }

    // 格式化序列为字符串
    function formatSequence(seq) {
        if (!seq || seq.length === 0) return '0';
        return seq.join(',');
    }

    // 格式化序列为括号表示
    function formatSequenceBracket(seq) {
        if (!seq || seq.length === 0) return '0';
        return seq.map(x => '(' + x + ')').join('');
    }

    // ==================== PrSS 核心算法 ====================

    // 查找坏根：从末尾向前找第一个小于末项的数
    function findBadRoot(seq) {
        if (seq.length === 0) return -1;
        let last = seq[seq.length - 1];
        for (let i = seq.length - 2; i >= 0; i--) {
            if (seq[i] < last) {
                return i;
            }
        }
        return -1;
    }

    // PrSS 展开函数
    // 根据定义: (#1, ai, #2, ak) -> (#1, ai, #2, ai, #2, ...)
    // 其中 ai = ak - 1 是 ak 前首个小于 ak 的数
    function expandPrSS(seq, n) {
        // 空序列: () = 0
        if (seq.length === 0) return [];

        let last = seq[seq.length - 1];

        // 情况 (2): (#, 0) = (#) + 1
        if (last === 0) {
            return seq.slice(0, -1);
        }

        // 情况 (3): 极限展开
        // 找坏根：末项前首个小于末项的数
        let badRootIdx = findBadRoot(seq);
        if (badRootIdx === -1) {
            // 如果没有找到小于末项的数（如 [0,1,2,3]），返回原序列
            return seq;
        }

        // 好部 G: 坏根之前的序列
        let G = seq.slice(0, badRootIdx);
        // 坏部 B: 从坏根到末项之前
        let B = seq.slice(badRootIdx, -1);

        // 构建结果: G + B + B + ... (n 次复制坏部)
        let result = [...G];
        for (let i = 0; i < n; i++) {
            result = result.concat(B);
        }

        return result;
    }

    // 判断序列是否为极限序数（需要展开）
    function isLimit(seq) {
        if (!seq || seq.length === 0) return false;
        let last = seq[seq.length - 1];
        // 末项为0时是后继，不是极限
        if (last === 0) return false;
        // 检查是否存在小于末项的数
        for (let i = seq.length - 2; i >= 0; i--) {
            if (seq[i] < last) {
                return true;
            }
        }
        return false;
    }

    // ==================== 比较函数 ====================

    // 字典序比较两个序列
    function compareSequences(a, b) {
        if (!Array.isArray(a) || !Array.isArray(b)) {
            if (a === b) return 0;
            return String(a) < String(b) ? -1 : 1;
        }

        let minLen = Math.min(a.length, b.length);
        for (let i = 0; i < minLen; i++) {
            if (a[i] < b[i]) return -1;
            if (a[i] > b[i]) return 1;
        }
        if (a.length < b.length) return -1;
        if (a.length > b.length) return 1;
        return 0;
    }

    // ==================== 规范化显示 ====================

    function displaySequence(expr) {
        if (expr === null || expr === undefined) return '';
        if (expr === 'Infinity' || expr === Infinity) return '∞';

        if (Array.isArray(expr)) {
            if (expr.length === 0) return '0';
            // 使用括号格式显示
            return expr.map(x => '(' + x + ')').join('');
        }

        if (typeof expr === 'string') {
            // 尝试解析并格式化
            let parsed = parseSequence(expr);
            if (parsed.length > 0) {
                return parsed.map(x => '(' + x + ')').join('');
            }
            return expr;
        }

        return String(expr);
    }

    // ==================== PrSS 注册 ====================

    register.push({
        id: 'prss',
        name: 'PrSS (原始序列系统)',

        // display: 将表达式转换为HTML显示
        display: function(expr) {
            return displaySequence(expr);
        },

        // able: 判断是否为极限序数
        able: function(expr) {
            if (!expr) return false;
            if (expr === 'Infinity' || expr === Infinity) return true;

            let seq;
            if (Array.isArray(expr)) {
                seq = expr;
            } else if (typeof expr === 'string') {
                seq = parseSequence(expr);
            } else {
                return false;
            }

            return isLimit(seq);
        },

        // compare: 比较两个表达式
        compare: function(a, b) {
            // Infinity 处理
            if (a === 'Infinity' || a === Infinity) {
                return (b === 'Infinity' || b === Infinity) ? 0 : 1;
            }
            if (b === 'Infinity' || b === Infinity) {
                return -1;
            }

            // 转换为数组进行比较
            let seqA, seqB;

            if (Array.isArray(a)) {
                seqA = a;
            } else if (typeof a === 'string') {
                seqA = parseSequence(a);
            } else {
                seqA = [a];
            }

            if (Array.isArray(b)) {
                seqB = b;
            } else if (typeof b === 'string') {
                seqB = parseSequence(b);
            } else {
                seqB = [b];
            }

            return compareSequences(seqA, seqB);
        },

        // FS: 基本序列展开
        FS: function(expr, n) {
            // 如果 expr 是 Infinity，返回其基本序列
            if (expr === 'Infinity' || expr === Infinity) {
                // 返回一个增长序列作为 Infinity 的基本序列
                let result = [];
                let len = Math.max(1, Math.floor(n) + 1);
                for (let i = 0; i < len; i++) {
                    result.push(i);
                }
                return result;
            }

            let seq;
            if (Array.isArray(expr)) {
                seq = expr;
            } else if (typeof expr === 'string') {
                seq = parseSequence(expr);
            } else {
                return expr;
            }

            if (!seq || seq.length === 0) return seq;
            if (!this.able(seq)) return seq;

            let times = Math.max(1, Math.floor(n));
            return expandPrSS(seq, times);
        },

        // FSalter: 替代展开方式（Shift+点击）
        FSalter: function(expr, n) {
            // 与FS相同，但使用不同的展开深度
            return this.FS(expr, n + 1);
        },

        // init: 初始化根节点
        init: function() {
            return [
                {
                    expr: Infinity,
                    low: [[]],
                    subitems: []
                },
                {
                    expr: [],
                    low: [[]],
                    subitems: []
                },
                {
                    expr: [0],
                    low: [[]],
                    subitems: []
                },
                {
                    expr: [0, 0],
                    low: [[0]],
                    subitems: []
                },
                {
                    expr: [0, 1],
                    low: [[0]],
                    subitems: []
                },
                {
                    expr: [0, 1, 2],
                    low: [[0, 1]],
                    subitems: []
                },
                {
                    expr: [0, 1, 2, 3],
                    low: [[0, 1, 2]],
                    subitems: []
                }
            ];
        },

        // semiable: 判断是否为半极限
        semiable: function(expr) {
            // PrSS 没有半极限概念
            return false;
        }
    });

    console.log('PrSS notation registered successfully!');

})();