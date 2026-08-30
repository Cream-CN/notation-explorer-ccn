// nTBMS.js - Naive TBMS (Transfinite BMS) Notation for NE-CCN
// Based on the definition: Extension of BMS to transfinite rows with ordinal exponents

(function() {
    // 注册到全局 register 数组
    if (typeof register === 'undefined') {
        console.error('nTBMS: register not found. Make sure this script is loaded after framework.js');
        return;
    }

    // ==================== 数据结构 ====================

    // 表示一个列: [row0, row1, row2, ...]
    // 使用对象表示，支持稀疏存储（只存储非零行）
    class Column {
        constructor(rows) {
            // rows 是数组 [v0, v1, v2, ...]
            // 或者对象 {0: v0, 1: v1, ...}
            if (Array.isArray(rows)) {
                this.rows = {};
                for (let i = 0; i < rows.length; i++) {
                    if (rows[i] !== 0) {
                        this.rows[i] = rows[i];
                    }
                }
                this._height = rows.length;
            } else if (typeof rows === 'object') {
                this.rows = {};
                for (let key in rows) {
                    if (rows[key] !== 0) {
                        this.rows[parseInt(key)] = rows[key];
                    }
                }
                // 计算高度
                let maxRow = 0;
                for (let key in this.rows) {
                    maxRow = Math.max(maxRow, parseInt(key));
                }
                this._height = maxRow + 1;
            } else {
                this.rows = {};
                this._height = 0;
            }
            // 存储行数（用于显示）
            this._rowCount = Object.keys(this.rows).length;
        }

        // 获取指定行的值
        get(row) {
            return this.rows[row] || 0;
        }

        // 获取高度（最大行索引+1）
        get height() {
            return this._height;
        }

        // 获取非零行数
        get rowCount() {
            return this._rowCount;
        }

        // 比较两列
        compare(other) {
            let maxH = Math.max(this.height, other.height);
            for (let i = maxH - 1; i >= 0; i--) {
                let a = this.get(i);
                let b = other.get(i);
                if (a !== b) return a - b;
            }
            return 0;
        }

        // 检查是否为零列
        isZero() {
            return Object.keys(this.rows).length === 0;
        }

        // 检查是否为全1列（在某一高度内全为1）
        isAllOnes(height) {
            for (let i = 0; i < height; i++) {
                if (this.get(i) !== 1) return false;
            }
            return true;
        }

        // 复制
        clone() {
            return new Column({...this.rows});
        }

        // 转换为数组（填充到指定高度）
        toArray(height) {
            let arr = [];
            for (let i = 0; i < height; i++) {
                arr.push(this.get(i));
            }
            return arr;
        }

        // 字符串表示
        toString() {
            if (this.isZero()) return '0';
            let parts = [];
            let rows = Object.keys(this.rows).sort((a, b) => parseInt(a) - parseInt(b));
            for (let key of rows) {
                let val = this.rows[key];
                if (val !== 0) {
                    parts.push(val);
                }
            }
            // 补全中间的零
            let maxRow = parseInt(rows[rows.length - 1]) || 0;
            let result = [];
            for (let i = 0; i <= maxRow; i++) {
                result.push(this.get(i));
            }
            return result.join(',');
        }

        // 压缩表示（去掉末尾零）
        toCompactString() {
            let arr = this.toArray(this.height);
            while (arr.length > 0 && arr[arr.length - 1] === 0) {
                arr.pop();
            }
            if (arr.length === 0) return '0';
            return arr.join(',');
        }

        // 创建带指数表示的列
        static fromCompact(str) {
            // 解析 "1^ω" 或 "1^2" 或 "1" 或 "1,1"
            let parts = str.split(',');
            let rows = {};
            let rowIdx = 0;
            for (let part of parts) {
                part = part.trim();
                if (part.includes('^')) {
                    let [base, exp] = part.split('^');
                    let baseVal = parseInt(base);
                    if (isNaN(baseVal)) {
                        // 处理像 "1^ω" 这样的表达式
                        rows[rowIdx] = { type: 'ordinal', base: base, exp: exp };
                    } else {
                        rows[rowIdx] = baseVal;
                    }
                } else {
                    let val = parseInt(part);
                    if (!isNaN(val)) {
                        rows[rowIdx] = val;
                    }
                }
                rowIdx++;
            }
            return new Column(rows);
        }
    }

    // ==================== 解析和格式化 ====================

    // 解析 TBMS 表达式
    // 格式: (0)(1^3)(2,1^2)(3,1)(2^2)
    // 或 (0,0,0)(1,1,1)(2,1,1)(3,1,0)(2,2,0)
    function parseTBMS(str) {
        str = str.trim();
        if (!str) return [];

        let columns = [];
        let i = 0;

        while (i < str.length) {
            if (str[i] === '(') {
                i++;
                let start = i;
                let depth = 1;
                while (i < str.length && depth > 0) {
                    if (str[i] === '(') depth++;
                    else if (str[i] === ')') depth--;
                    i++;
                }
                let colStr = str.substring(start, i - 1);
                // 解析列内容
                let col = parseColumn(colStr);
                if (col) columns.push(col);
            } else {
                i++;
            }
        }

        return columns;
    }

    // 解析单个列
    function parseColumn(str) {
        if (!str || str.trim() === '') return new Column([]);

        let parts = str.split(',');
        let rows = {};
        let rowIdx = 0;

        for (let part of parts) {
            part = part.trim();
            if (!part) continue;

            // 检查是否包含指数表示
            if (part.includes('^')) {
                let [base, exp] = part.split('^');
                let baseVal = parseInt(base);
                if (!isNaN(baseVal)) {
                    // 如果是数字指数
                    if (/^\d+$/.test(exp)) {
                        let expVal = parseInt(exp);
                        // 展开指数: 1^3 -> 1,1,1
                        for (let j = 0; j < expVal; j++) {
                            rows[rowIdx + j] = baseVal;
                        }
                        rowIdx += expVal;
                    } else {
                        // 序数指数: 1^ω
                        rows[rowIdx] = { type: 'ordinal_exp', base: baseVal, exp: exp };
                        rowIdx++;
                    }
                } else {
                    // 可能是字符串指数
                    rows[rowIdx] = { type: 'ordinal_exp', base: part, exp: exp };
                    rowIdx++;
                }
            } else {
                let val = parseInt(part);
                if (!isNaN(val)) {
                    rows[rowIdx] = val;
                    rowIdx++;
                }
            }
        }

        return new Column(rows);
    }

    // 格式化 TBMS 表达式
    function formatTBMS(columns, useCompact = true) {
        if (!columns || columns.length === 0) return '0';

        let result = [];
        for (let col of columns) {
            if (useCompact) {
                result.push('(' + col.toCompactString() + ')');
            } else {
                result.push('(' + col.toString() + ')');
            }
        }
        return result.join('');
    }

    // ==================== BMS 核心算法 ====================

    // 查找坏根（Standard BMS bad root finding）
    function findBadRoot(columns, lastCol) {
        if (columns.length <= 1) return -1;

        let n = columns.length - 1;
        let last = columns[n];

        // 从倒数第二列开始向前查找
        for (let i = n - 1; i >= 0; i--) {
            let col = columns[i];
            // 检查列是否小于最后一列
            if (col.compare(last) < 0) {
                // 检查是否满足祖先条件
                let valid = true;
                for (let j = i + 1; j < n; j++) {
                    if (columns[j].compare(col) <= 0) {
                        valid = false;
                        break;
                    }
                }
                if (valid) {
                    return i;
                }
            }
        }
        return -1;
    }

    // 计算delta
    function computeDelta(columns, badRootIdx) {
        if (badRootIdx < 0) return new Column([]);

        let n = columns.length - 1;
        let last = columns[n];
        let badRoot = columns[badRootIdx];

        // delta = last - badRoot
        let maxH = Math.max(last.height, badRoot.height);
        let deltaRows = {};
        for (let i = 0; i < maxH; i++) {
            let diff = last.get(i) - badRoot.get(i);
            if (diff !== 0) {
                deltaRows[i] = diff;
            }
        }
        return new Column(deltaRows);
    }

    // 复制坏部并应用delta
    function copyBadPart(columns, badRootIdx, delta, k) {
        let n = columns.length - 1;
        let result = [];

        for (let i = badRootIdx; i < n; i++) {
            let col = columns[i];
            let newRows = {};
            let maxH = col.height;
            for (let j = 0; j < maxH; j++) {
                let val = col.get(j) + k * delta.get(j);
                if (val !== 0) {
                    newRows[j] = val;
                }
            }
            result.push(new Column(newRows));
        }

        return result;
    }

    // ==================== TBMS 展开 ====================

    // 检查列是否包含序数指数
    function hasOrdinalExp(col) {
        for (let key in col.rows) {
            if (typeof col.rows[key] === 'object' && col.rows[key].type === 'ordinal_exp') {
                return true;
            }
        }
        return false;
    }

    // 获取列的最后一个非零项
    function getLastNonZero(col) {
        let keys = Object.keys(col.rows).sort((a, b) => parseInt(b) - parseInt(a));
        for (let key of keys) {
            let val = col.rows[key];
            if (val !== 0) {
                return { row: parseInt(key), value: val };
            }
        }
        return null;
    }

    // 检查是否为极限序数指数
    function isLimitOrdinal(exp) {
        // ω, ω+1, ω^2, etc.
        // 简单判断：包含字母的为极限
        return /[a-zA-Z]/.test(exp) || exp.includes('ω');
    }

    // 获取极限序数的基本序列
    function getOrdinalFS(exp, n) {
        if (exp === 'ω' || exp === 'omega') {
            return String(n);
        }
        if (exp.startsWith('ω+')) {
            let num = parseInt(exp.substring(2));
            if (!isNaN(num)) {
                return exp.substring(0, 2) + (num + n);
            }
        }
        if (exp.startsWith('ω^')) {
            let inner = exp.substring(2);
            if (inner === 'ω') {
                return 'ω^' + String(n);
            }
            if (isLimitOrdinal(inner)) {
                // 处理更复杂的情况
                return exp;
            }
        }
        return exp;
    }

    // 展开序数指数列
    function expandOrdinalColumn(col, n) {
        let newRows = {};
        for (let key in col.rows) {
            let val = col.rows[key];
            if (typeof val === 'object' && val.type === 'ordinal_exp') {
                // 展开指数
                let exp = val.exp;
                if (isLimitOrdinal(exp)) {
                    let newExp = getOrdinalFS(exp, n);
                    newRows[parseInt(key)] = { type: 'ordinal_exp', base: val.base, exp: newExp };
                } else {
                    // 有限指数：展开为多个行
                    let count = parseInt(exp);
                    if (!isNaN(count)) {
                        let rowIdx = parseInt(key);
                        for (let j = 0; j < count; j++) {
                            newRows[rowIdx + j] = val.base;
                        }
                    } else {
                        newRows[parseInt(key)] = val;
                    }
                }
            } else {
                newRows[parseInt(key)] = val;
            }
        }
        return new Column(newRows);
    }

    // 主展开函数
    function expandTBMS(expr, n) {
        let columns = parseTBMS(expr);
        if (!columns || columns.length === 0) return expr;

        let nVal = Math.max(0, Math.floor(n));

        // 检查最后一列是否包含序数指数
        let lastCol = columns[columns.length - 1];
        let lastNonZero = getLastNonZero(lastCol);

        // 如果最后一列为零，删除它
        if (lastCol.isZero()) {
            return formatTBMS(columns.slice(0, -1));
        }

        // 检查是否包含极限序数指数
        if (hasOrdinalExp(lastCol)) {
            // 展开序数指数
            let expandedCol = expandOrdinalColumn(lastCol, nVal);
            let newColumns = columns.slice(0, -1);
            newColumns.push(expandedCol);
            return formatTBMS(newColumns);
        }

        // 标准 BMS 展开
        let badRootIdx = findBadRoot(columns, lastCol);
        if (badRootIdx < 0) {
            // 如果没有找到坏根，尝试简化展开
            if (columns.length === 1) {
                // 单列的情况
                let lastVal = lastCol.get(0);
                if (lastVal === 0) return '0';
                if (lastVal === 1) {
                    // (1) -> 0
                    return '0';
                }
                // (m) -> (m-1) 重复
                let result = [];
                for (let i = 0; i < nVal + 1; i++) {
                    result.push(new Column([lastVal - 1]));
                }
                return formatTBMS(result);
            }
            return expr;
        }

        let delta = computeDelta(columns, badRootIdx);
        let G = columns.slice(0, badRootIdx);
        let B = columns.slice(badRootIdx, -1);

        let result = [...G];

        // 复制坏部 n 次
        for (let k = 0; k < nVal + 1; k++) {
            let copied = copyBadPart(columns, badRootIdx, delta, k);
            result = result.concat(copied);
        }

        return formatTBMS(result);
    }

    // ==================== 判断是否为极限 ====================

    function isLimit(expr) {
        if (typeof expr !== 'string') return false;
        if (!expr || expr.trim() === '') return false;

        try {
            let columns = parseTBMS(expr);
            if (!columns || columns.length === 0) return false;

            let lastCol = columns[columns.length - 1];

            // 如果最后一列为零，不是极限
            if (lastCol.isZero()) return false;

            // 如果包含序数指数，是极限
            if (hasOrdinalExp(lastCol)) {
                let lastNonZero = getLastNonZero(lastCol);
                if (lastNonZero && typeof lastNonZero.value === 'object') {
                    if (isLimitOrdinal(lastNonZero.value.exp)) {
                        return true;
                    }
                }
            }

            // 标准 BMS 极限判断
            let badRootIdx = findBadRoot(columns, lastCol);
            if (badRootIdx >= 0) {
                // 检查是否为真正的极限
                let lastVal = lastCol.get(0);
                if (lastVal > 0) return true;
            }

            // 单列情况
            if (columns.length === 1) {
                let val = lastCol.get(0);
                return val > 1;
            }

            return false;
        } catch (e) {
            return false;
        }
    }

    // ==================== 比较函数 ====================

    function compareTBMS(a, b) {
        if (a === b) return 0;
        if (a === 'Infinity' || a === Infinity) return 1;
        if (b === 'Infinity' || b === Infinity) return -1;

        try {
            let aCols = parseTBMS(a);
            let bCols = parseTBMS(b);

            if (!aCols || aCols.length === 0) {
                return (!bCols || bCols.length === 0) ? 0 : -1;
            }
            if (!bCols || bCols.length === 0) return 1;

            let minLen = Math.min(aCols.length, bCols.length);
            for (let i = 0; i < minLen; i++) {
                let cmp = aCols[i].compare(bCols[i]);
                if (cmp !== 0) return cmp;
            }
            if (aCols.length < bCols.length) return -1;
            if (aCols.length > bCols.length) return 1;
            return 0;
        } catch (e) {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        }
    }

    // ==================== nTBMS 注册 ====================

    register.push({
        id: 'ntbms',
        name: 'Naive TBMS',

        // display: 将表达式转换为HTML显示
        display: function(expr) {
            if (expr === null || expr === undefined) return '';
            if (expr === 'Infinity' || expr === Infinity) return '∞';

            if (typeof expr === 'string') {
                try {
                    let columns = parseTBMS(expr);
                    if (columns && columns.length > 0) {
                        return formatTBMS(columns, true);
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

            return compareTBMS(a, b);
        },

        // FS: 基本序列展开
        FS: function(expr, n) {
            if (expr === 'Infinity' || expr === Infinity) {
                // 返回 (0)(1^ω) 的极限序列
                return '(0)(1)';
            }

            if (typeof expr !== 'string') return expr;
            if (!expr || expr.trim() === '') return expr;
            if (!this.able(expr)) return expr;

            try {
                return expandTBMS(expr, n);
            } catch (e) {
                console.warn('nTBMS expansion failed:', e);
                return expr;
            }
        },

        // FSalter: 替代展开方式（Shift+点击）
        FSalter: function(expr, n) {
            // 使用不同的展开深度
            return this.FS(expr, n + 1);
        },

        // init: 初始化根节点
        init: function() {
            return [
                {
                    expr: Infinity,
                    low: ['(0)(1)'],
                    subitems: []
                },
                {
                    expr: '0',
                    low: ['0'],
                    subitems: []
                },
                {
                    expr: '(0)',
                    low: ['0'],
                    subitems: []
                },
                {
                    expr: '(0)(1)',
                    low: ['(0)'],
                    subitems: []
                },
                {
                    expr: '(0)(1)(2)',
                    low: ['(0)(1)'],
                    subitems: []
                },
                {
                    expr: '(0)(1^ω)',
                    low: ['(0)(1)'],
                    subitems: []
                }
            ];
        },

        // semiable: 判断是否为半极限
        semiable: function(expr) {
            return false;
        }
    });

    console.log('nTBMS (Naive TBMS) notation registered successfully!');

})();