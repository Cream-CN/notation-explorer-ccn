// css1.js - CSS 表示法注册器
// 标识符: css1, 名称: CSS
/*
由Cream-CN编写
使用Unlicense
*/
(function(register) {
    // 辅助函数：获取序列中最后一个小于 s[i] 的位置
    function getP(s, i) {
        for (let j = i - 1; j >= 0; j--) {
            if (s[j] < s[i]) return j;
        }
        return -1;
    }

    // 辅助函数：判断区间 [a, b] 是否单调递增（非严格）
    function isND(s, a, b) {
        let l = a < b ? a : b;
        let r = a < b ? b : a;
        for (let k = l; k < r; k++) {
            if (s[k] > s[k + 1]) return false;
        }
        return true;
    }

    // 核心展开函数：给定序列 s 和复制次数 n，返回展开后的序列
    function expandCss(s, n) {
        if (!s || s.length === 0) return [];
        let seq = s.slice();
        let lI = seq.length - 1;
        if (lI < 0) return [];

        let P = getP(seq, lI);
        if (P === -1) {
            seq.pop();
            return seq;
        }

        let bRI = -1;
        if (seq[lI - 1] >= seq[lI]) {
            for (let i = 0; i <= lI; i++) {
                if (isND(seq, i, P)) {
                    bRI = i;
                    break;
                }
            }
        } else {
            bRI = P;
        }

        if (bRI === -1) {
            seq.pop();
            return seq;
        }

        let dt = seq[lI] - seq[bRI] - 1;
        let gP = seq.slice(0, bRI);
        let bP = seq.slice(bRI, lI);

        let res = gP.concat(bP);
        for (let i = 1; i <= n; i++) {
            let add = bP.map(v => v + dt * i);
            res = res.concat(add);
        }
        return res;
    }

    // ---------- 注册器条目 ----------
    register.push({
        id: 'css1',
        name: 'CSS',

        // display: 将表达式转为 HTML 字符串
        display: function(expr) {
            if (!expr || expr.length === 0) return '0';
            if (expr === Infinity || (Array.isArray(expr) && expr.length === 1 && expr[0] === Infinity)) {
                return '∞';
            }
            if (Array.isArray(expr)) {
                return expr.join(', ');
            }
            return String(expr);
        },

        // able: 判断是否为极限（需要展开）
        able: function(expr) {
            if (!expr || expr.length === 0) return false;
            if (expr === Infinity || (Array.isArray(expr) && expr.length === 1 && expr[0] === Infinity)) {
                return true;
            }
            if (!Array.isArray(expr)) return false;
            // 序列长度 >= 2 且最后一个元素不小于倒数第二个时，视为极限
            if (expr.length >= 2) {
                let last = expr[expr.length - 1];
                let prev = expr[expr.length - 2];
                return last >= prev;
            }
            // 单元素序列，若元素 >= 1 视为极限（如 [1] -> [0]）
            return expr.length === 1 && expr[0] >= 1;
        },

        // compare: 比较两个表达式
        compare: function(a, b) {
            // 处理 Infinity
            const isInf = (x) => x === Infinity || (Array.isArray(x) && x.length === 1 && x[0] === Infinity);
            if (isInf(a) && isInf(b)) return 0;
            if (isInf(a)) return 1;
            if (isInf(b)) return -1;

            // 处理空序列（表示 0）
            const isEmpty = (x) => !x || x.length === 0;
            if (isEmpty(a) && isEmpty(b)) return 0;
            if (isEmpty(a)) return -1;
            if (isEmpty(b)) return 1;

            if (!Array.isArray(a) || !Array.isArray(b)) {
                return String(a).localeCompare(String(b));
            }

            // 按字典序比较
            let minLen = Math.min(a.length, b.length);
            for (let i = 0; i < minLen; i++) {
                if (a[i] < b[i]) return -1;
                if (a[i] > b[i]) return 1;
            }
            if (a.length < b.length) return -1;
            if (a.length > b.length) return 1;
            return 0;
        },

        // FS: 基本序列展开，返回第 n 项
        FS: function(expr, n) {
            if (n < 0) n = 0;
            // 处理 Infinity
            if (expr === Infinity || (Array.isArray(expr) && expr.length === 1 && expr[0] === Infinity)) {
                // Infinity 的基本序列：n 次迭代
                let result = [];
                for (let i = 0; i <= n; i++) {
                    result.push(i);
                }
                return result;
            }

            if (!Array.isArray(expr) || expr.length === 0) {
                return [];
            }

            // 对极限序列做展开
            let seq = expr.slice();
            let lI = seq.length - 1;
            let P = getP(seq, lI);

            if (P === -1) {
                // 没有小于最后一个元素的位置，直接移除最后一个
                seq.pop();
                // 进一步展开 n 次
                for (let i = 0; i < n; i++) {
                    if (seq.length === 0) break;
                    let newP = getP(seq, seq.length - 1);
                    if (newP === -1) {
                        seq.pop();
                    } else {
                        // 简化处理：递归调用自身
                        return this.FS(seq, n - i - 1);
                    }
                }
                return seq;
            }

            // 使用 expandCss 展开，复制次数为 n+1
            let result = expandCss(seq, n + 1);
            return result;
        },

        // FSalter: 备用展开（完整展开），按住 Shift 时使用
        FSalter: function(expr, n) {
            if (n < 0) n = 0;
            if (expr === Infinity || (Array.isArray(expr) && expr.length === 1 && expr[0] === Infinity)) {
                let result = [];
                for (let i = 0; i <= n + 2; i++) {
                    result.push(i);
                }
                return result;
            }
            if (!Array.isArray(expr) || expr.length === 0) {
                return [];
            }

            // 完整展开：使用更大的复制次数
            let seq = expr.slice();
            let lI = seq.length - 1;
            let P = getP(seq, lI);

            if (P === -1) {
                seq.pop();
                return seq;
            }

            // 使用 expandCss，复制次数为 n + 3（更完整）
            let result = expandCss(seq, n + 3);
            return result;
        },

        // init: 返回初始数据集
        init: function() {
            return [
                {
                    expr: [Infinity],   // 伪极限
                    low: [[]],          // 下界为 0
                    subitems: []
                },
                {
                    expr: [],           // 0
                    low: [[]],
                    subitems: []
                },
                {
                    expr: [1],          // 1
                    low: [[]],
                    subitems: []
                },
                {
                    expr: [1, 2],       // 1,2
                    low: [[]],
                    subitems: []
                }
            ];
        },

        // semiable: 判断是否为半极限（可选）
        semiable: function(expr) {
            if (!expr || expr.length === 0) return false;
            if (!Array.isArray(expr)) return false;
            // 长度 >= 2 且最后一个元素比前一个至少大 2，视为半极限
            if (expr.length >= 2) {
                let last = expr[expr.length - 1];
                let prev = expr[expr.length - 2];
                return last - prev >= 2;
            }
            return false;
        }
    });

    // 控制台输出提示
    //console.log('[css1] CSS 表示法已注册。');
})(window.register || (window.register = []));