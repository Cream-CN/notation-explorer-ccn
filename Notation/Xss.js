// xss.js - XSS 表示法注册器
// 标识符: xss, 名称: XSS (CalcList)

(function(register) {
    'use strict';

    // ---------- 核心算法（直接取自 HTML，稍作调整） ----------

    // 获取元素的“值”：如果是数组，取第一个元素的值（递归）
    function deepValue(x) {
        if (Array.isArray(x)) {
            if (x.length === 0) return 0;
            return deepValue(x[0]);
        }
        return Number(x);
    }

    // 在 lst 中，从 end 往前找第一个值小于 a 的索引
    function findBad(lst, a, end) {
        end = (end === undefined) ? lst.length - 1 : end;
        for (var i = end; i >= 0; i--) {
            if (deepValue(lst[i]) < a) {
                return i;
            }
        }
        return -1;
    }

    // 从后往前找第一个值大于 1 的索引
    function findGood(lst) {
        for (var i = lst.length - 1; i >= 0; i--) {
            if (deepValue(lst[i]) > 1) {
                return i;
            }
        }
        return -1;
    }

    // 对结构中的所有数值增加 delta
    function incrementStructure(struct, delta) {
        if (Array.isArray(struct)) {
            return struct.map(function(item) {
                return incrementStructure(item, delta);
            });
        } else {
            return Number(struct) + delta;
        }
    }

    // 深拷贝
    function deepCopy(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // 一次展开（对应 HTML 中的 expandOnce）
    function expandOnce(data, N) {
        var lst = deepCopy(data);

        // 规则1：最后一项是数组 → 展平一次
        if (Array.isArray(lst[lst.length - 1])) {
            var last = lst.pop();
            lst.push.apply(lst, last);
            return lst;
        }

        var lastVal = deepValue(lst[lst.length - 1]);

        // 规则2：最后一项不是 1
        if (lastVal !== 1) {
            var aVal = lastVal;
            var bIdx = findBad(lst, aVal, lst.length - 2);
            if (bIdx === -1) return lst;

            var segment = lst.slice(bIdx, -1);
            var bVal = deepValue(lst[bIdx]);
            var d = aVal - bVal - 1;

            lst = lst.slice(0, bIdx);
            for (var i = 0; i < N; i++) {
                var segCopy = incrementStructure(deepCopy(segment), i * d);
                lst.push.apply(lst, segCopy);
            }
            return lst;
        }

        // 规则3：最后一项是 1（只处理一个 1）
        lst.pop(); // 移除一个 1

        var aIdx = findGood(lst);
        if (aIdx === -1) return lst;

        var a = deepValue(lst[aIdx]);
        var bIdx = findBad(lst, a, aIdx - 1);
        if (bIdx === -1) return lst;

        var segment = lst.slice(bIdx, aIdx + 1);
        var end1 = lst.slice(aIdx + 1);
        var bVal = deepValue(lst[bIdx]);
        var d = a - bVal - 1;

        lst = lst.slice(0, bIdx);
        var groups = [];
        for (var j = 0; j < N; j++) {
            var segCopy = incrementStructure(deepCopy(segment), j * d);
            var group = segCopy.concat(deepCopy(end1));
            groups.push(group);
        }
        lst.push.apply(lst, groups);
        return lst;
    }

    // ---------- 表示法公共函数 ----------

    // 将序列格式化为可读字符串（使用圆括号）
    function formatOutput(arr) {
        if (!arr || arr.length === 0) return '0';
        var parts = arr.map(function(item) {
            if (Array.isArray(item)) {
                return '(' + formatOutput(item) + ')';
            }
            return item;
        });
        return parts.join(',');
    }

    // display 函数
    function display(expr) {
        if (!expr || expr.length === 0) return '0';
        if (expr === Infinity || (Array.isArray(expr) && expr.length === 1 && expr[0] === Infinity)) {
            return 'Limit';
        }
        return formatOutput(expr);
    }

    // 递归比较两个序列（数字视为单元素数组）
    function compareArrays(a, b) {
        // 将数字包装为数组
        var normA = Array.isArray(a) ? a : [a];
        var normB = Array.isArray(b) ? b : [b];

        // 比较长度
        if (normA.length < normB.length) return -1;
        if (normA.length > normB.length) return 1;

        // 长度相同，逐元素比较
        for (var i = 0; i < normA.length; i++) {
            var elA = normA[i];
            var elB = normB[i];
            // 如果两者都是数字，直接比较
            if (typeof elA === 'number' && typeof elB === 'number') {
                if (elA < elB) return -1;
                if (elA > elB) return 1;
            } else {
                // 至少一个是数组，递归比较
                var cmp = compareArrays(elA, elB);
                if (cmp !== 0) return cmp;
            }
        }
        return 0;
    }

    function compare(a, b) {
        // 处理伪极限
        var isInf = function(x) {
            return x === Infinity || (Array.isArray(x) && x.length === 1 && x[0] === Infinity);
        };
        if (isInf(a) && isInf(b)) return 0;
        if (isInf(a)) return 1;
        if (isInf(b)) return -1;

        // 空序列处理
        if (!a || a.length === 0) {
            if (!b || b.length === 0) return 0;
            return -1;
        }
        if (!b || b.length === 0) return 1;

        // 递归比较
        return compareArrays(a, b);
    }

    // 判断是否为极限（可展开）
    function able(expr) {
        if (!expr || expr.length === 0) return false;
        if (expr === Infinity || (Array.isArray(expr) && expr.length === 1 && expr[0] === Infinity)) {
            return true;
        }

        var last = expr[expr.length - 1];
        // 最后一项是数组 → 可展平
        if (Array.isArray(last)) return true;

        var lastVal = Number(last);
        if (lastVal > 1) return true;

        // lastVal === 1 的情况：检查前面是否存在 >1 的元素
        if (lastVal === 1) {
            var prefix = expr.slice(0, -1);
            return findGood(prefix) !== -1;
        }

        return false;
    }

    // ---------- FS 函数 ----------

    function expand(seq, n) {
        if (n < 0) n = 0;
        // 伪极限展开：生成 [0], [1], ..., [n]
        if (seq && seq.length === 1 && seq[0] === Infinity) {
            var res = [];
            for (var i = 0; i <= n; i++) res.push(i);
            return res;
        }
        if (!seq || seq.length === 0) return [];

        var result = expandOnce(seq, n);
        return result;
    }

    // ---------- init ----------

    function init() {
        return [
            { expr: [Infinity], low: [[0]], subitems: [] },
            { expr: [], low: [[0]], subitems: [] }
        ];
    }

    // ---------- 注册 ----------

    register.push({
        id: 'xss',
        name: 'XSS',

        display: display,
        able: able,
        compare: compare,

        FS: (function() {
            var cache = {};
            return function(seq, n) {
                if (n < 0) n = 0;
                var key = JSON.stringify(seq) + '@' + n;
                if (cache[key]) return cache[key];
                var result = expand(seq, n);
                cache[key] = result;
                return result;
            };
        })(),

        // FSalter 可选，这里提供相同行为（完整展开）
        FSalter: (function() {
            var cache = {};
            return function(seq, n) {
                if (n < 0) n = 0;
                var key = JSON.stringify(seq) + '@' + n + '_full';
                if (cache[key]) return cache[key];
                // 与 FS 相同，因为 expandOnce 已完整复制
                var result = expand(seq, n);
                cache[key] = result;
                return result;
            };
        })(),

        init: init,

        // 半极限判断（可选）
        semiable: function(expr) {
            if (!expr || expr.length === 0) return false;
            var last = expr[expr.length - 1];
            if (Array.isArray(last)) return true;
            var lastVal = Number(last);
            // 如果最后一项是 1 且前面有 >1 的元素，则视为半极限
            if (lastVal === 1) {
                var prefix = expr.slice(0, -1);
                return findGood(prefix) !== -1;
            }
            return lastVal > 1;
        }
    });

    //console.log('[xss] XSS (CalcList) 表示法已注册。');
})(window.register || (window.register = []));