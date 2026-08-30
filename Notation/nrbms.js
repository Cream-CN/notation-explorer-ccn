// nrBMS.js - Non-recursive BMS Notation for NE-CCN
// Based on BMS (BM4) with non-recursive expansion when bad root is not found

(function() {
    // 注册到全局 register 数组
    if (typeof register === 'undefined') {
        console.error('nrBMS: register not found. Make sure this script is loaded after framework.js');
        return;
    }

    // ==================== 工具函数 ====================

    // 序列比较（字典序）
    function sequence_compare(a, b) {
        var len = Math.min(a.length, b.length);
        for (var i = 0; i < len; i++) {
            if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
        }
        if (a.length < b.length) return -1;
        if (a.length > b.length) return 1;
        return 0;
    }

    // 矩阵比较
    function matrix_compare(m1, m2) {
        if (m1.length === 0) {
            if (m2.length === 0) return 0;
            else return -1;
        } else {
            if (m2.length === 0) return 1;
            else {
                var col1 = m1[0],
                    col2 = m2[0];
                var lenDiff = col1.length - col2.length;
                if (lenDiff > 0) col2 = col2.concat(Array(lenDiff).fill(0));
                else if (lenDiff < 0) col1 = col1.concat(Array(-lenDiff).fill(0));
                var cmp = sequence_compare(col1, col2);
                if (cmp) return cmp;
                else return matrix_compare(m1.slice(1), m2.slice(1));
            }
        }
    }

    // 矩阵显示
    function matrix_display(expr) {
        if (expr === 'Infinity' || expr === Infinity) return 'Limit';
        if (!Array.isArray(expr)) return String(expr);
        // 移除列末尾的零（压缩显示）
        var compressed = expr.map(function(col) {
            var c = col.slice();
            while (c.length > 0 && c[c.length - 1] === 0) c.pop();
            return c.length ? c : [0];
        });
        return compressed.map(function(col) { return '(' + col.join(',') + ')'; }).join('');
    }

    // 判断是否为极限（末列第一个元素 > 0）
    function matrix_limit(m) {
        return m.length > 0 && m[m.length - 1][0] > 0;
    }

    // ==================== BM4 核心算法（拷贝自 bms.js） ====================

    function BM4(m, FSterm) {
        var parent_cache = {},
            ascending_cache = {};

        var parent = function(x, y) {
            var str = x + ',' + y;
            if (parent_cache[str] !== undefined) return parent_cache[str];
            for (var p = x; (p = y ? parent(p, y - 1) : p - 1) >= 0;) {
                if (m[p][y] < m[x][y]) break;
            }
            return parent_cache[str] = p;
        };

        var ascending = function(r, x, y) {
            var str = r + ',' + x + ',' + y;
            if (ascending_cache[str] !== undefined) return ascending_cache[str];
            return ascending_cache[str] = r <= x && (r === x || ascending(r, parent(x, y), y));
        };

        var endcol = m.length - 1;
        var child = m[endcol];
        var ymax = child.length - 1;
        var LNZ;
        for (LNZ = ymax; LNZ >= 0; --LNZ) {
            if (child[LNZ] > 0) break;
        }
        // 如果全零，直接返回去掉末列
        if (LNZ < 0) return m.slice(0, endcol);

        var BR = parent(endcol, LNZ);
        // 如果找不到坏根（BR < 0），则返回 null 以便外部处理非递归展开
        if (BR < 0) return null;

        var BRcolumn = m[BR];
        var offset = child.map(function(value, y) {
            return y < LNZ ? value - BRcolumn[y] : 0;
        });
        var offset_asc = Array(endcol).fill(0, BR).map(function(t, x) {
            return offset.map(function(value, y) {
                return ascending(BR, x, y) ? value : 0;
            });
        });

        var result = m.slice(0, endcol);
        var col, n;
        for (n = 0; ++n <= FSterm;) {
            for (col = BR; col < endcol; ++col) {
                result.push(m[col].map(function(value, y) {
                    return value + offset_asc[col][y] * n;
                }));
            }
        }
        // 如果所有列在 ymax 行都为0，则截断该行
        if (ymax > 0 && result.every(function(column) { return column[ymax] === 0; })) {
            result = result.map(function(column) { return column.slice(0, ymax); });
        }
        return result;
    }

    // ==================== 非递归展开 ====================

    function nonRecursiveExpand(m) {
        // 末列必须是存在的
        var lastCol = m[m.length - 1];
        // 找到最后一个非零项
        var p = -1;
        for (var i = lastCol.length - 1; i >= 0; i--) {
            if (lastCol[i] > 0) { p = i; break; }
        }
        // 如果全是零，不应该到这里（但安全处理）
        if (p === -1) return m.slice(0, -1);

        // 构造新末列：将最后一个非零项变为0
        var newLastCol = lastCol.slice();
        newLastCol[p] = 0;
        // 构造追加列：所有元素 +1
        var addCol = lastCol.map(function(v) { return v + 1; });

        // 结果矩阵 = 原矩阵去掉末列 + newLastCol + addCol
        var result = m.slice(0, -1);
        result.push(newLastCol);
        result.push(addCol);
        return result;
    }

    // ==================== 主展开函数 ====================

    function expandNRBMS(m, FSterm) {
        // 处理 Infinity
        if (m === 'Infinity' || m === Infinity) {
            // 返回一个基本序列： (0)(1)(2)... 或类似
            var result = [];
            for (var i = 0; i < FSterm + 1; i++) {
                result.push(Array(i + 1).fill(1));
            }
            return result;
        }

        if (!Array.isArray(m) || m.length === 0) return [];

        var endcol = m.length - 1;
        var lastCol = m[endcol];

        // 如果末列是 (1)（即长度为1且值为1），后继：删除末列
        if (lastCol.length === 1 && lastCol[0] === 1) {
            return m.slice(0, endcol);
        }

        // 尝试标准 BM4 展开
        var bmResult = BM4(m, FSterm);
        if (bmResult !== null) {
            // 标准展开成功
            return bmResult;
        }

        // 否则执行非递归展开
        return nonRecursiveExpand(m);
    }

    // ==================== 判断是否为极限 ====================

    function isLimit(m) {
        if (m === 'Infinity' || m === Infinity) return true;
        if (!Array.isArray(m) || m.length === 0) return false;
        var last = m[m.length - 1];
        // 如果末列是 (1)，则不是极限（后继）
        if (last.length === 1 && last[0] === 1) return false;
        // 如果末列第一个元素 > 0 则为极限（包括非递归情况）
        return last[0] > 0;
    }

    // ==================== 注册 ====================

    register.push({
        id: 'nrbms',
        name: 'Non-recursive BMS',

        // display
        display: function(expr) {
            if (expr === null || expr === undefined) return '';
            if (expr === 'Infinity' || expr === Infinity) return '∞';
            if (Array.isArray(expr)) {
                return matrix_display(expr);
            }
            return String(expr);
        },

        // able
        able: function(expr) {
            if (expr === 'Infinity' || expr === Infinity) return true;
            if (!Array.isArray(expr)) return false;
            return isLimit(expr);
        },

        // compare
        compare: function(a, b) {
            if (a === 'Infinity' || a === Infinity) {
                return (b === 'Infinity' || b === Infinity) ? 0 : 1;
            }
            if (b === 'Infinity' || b === Infinity) {
                return -1;
            }
            if (!Array.isArray(a) || !Array.isArray(b)) {
                if (a === b) return 0;
                return String(a) < String(b) ? -1 : 1;
            }
            return matrix_compare(a, b);
        },

        // FS
        FS: function(expr, n) {
            var FSterm = Math.max(0, Math.floor(n));
            if (expr === 'Infinity' || expr === Infinity) {
                // 返回基本序列：使用 n+1 列，每列为 (1,1,...,1) 长度递增
                var result = [];
                for (var i = 0; i <= FSterm; i++) {
                    result.push(Array(i + 1).fill(1));
                }
                return result;
            }
            if (!Array.isArray(expr) || expr.length === 0) return expr;
            if (!this.able(expr)) return expr;

            try {
                return expandNRBMS(expr, FSterm);
            } catch (e) {
                console.warn('nrBMS expansion failed:', e);
                return expr;
            }
        },

        // FSalter: 替代展开（与 FS 相同，但可提供不同深度）
        FSalter: function(expr, n) {
            return this.FS(expr, n + 1);
        },

        // init
        init: function() {
            return [
                { expr: Infinity, low: [[]], subitems: [] },
                { expr: [], low: [[]], subitems: [] },
                { expr: [0], low: [[]], subitems: [] },
                { expr: [1], low: [[0]], subitems: [] },
                { expr: [0, 1], low: [[0]], subitems: [] }
            ];
        },

        // semiable
        semiable: function(expr) {
            return false;
        }
    });

    console.log('nrBMS (Non-recursive BMS) registered successfully!');

})();