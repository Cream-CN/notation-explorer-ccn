// GPSS2.js - GPSS2 Notation for NE-CCN
// Based on the original GPSS.html implementation

(function() {
    // 注册到全局 register 数组
    if (typeof register === 'undefined') {
        console.error('GPSS2: register not found. Make sure this script is loaded after framework.js');
        return;
    }

    // 辅助函数：比较两列（字典序：先第一行，后第二行）
    function compareColumns(a, b) {
        if (a[0] !== b[0]) return a[0] - b[0];
        return a[1] - b[1];
    }

    // 比较两个列数组的字典序（逐列）
    function compareColumnArrays(arrA, arrB) {
        const minLen = Math.min(arrA.length, arrB.length);
        for (let i = 0; i < minLen; i++) {
            const cmp = compareColumns(arrA[i], arrB[i]);
            if (cmp !== 0) return cmp;
        }
        if (arrA.length < arrB.length) return -1;
        if (arrA.length > arrB.length) return 1;
        return 0;
    }

    // 规范化一个列数组：每列减去第一列（分量减）
    function normalizeArray(arr) {
        if (arr.length === 0) return [];
        const first = arr[0];
        return arr.map(col => [col[0] - first[0], col[1] - first[1]]);
    }

    // 分段逻辑（整个序列，a = 末列第二行 - 1）
    function buildSegments(columns, a) {
        const n = columns.length;
        const used = new Array(n).fill(false);
        const segments = [];

        for (let i = n - 1; i >= 0; i--) {
            const col = columns[i];
            const second = col[1];
            if (second === a && !used[i]) {
                segments.push({ start: i, end: i, cols: [col], special: false });
                used[i] = true;
            }
            else if (second < a) {
                segments.push({ start: i, end: i, cols: [col], special: true });
            }
            else if (second > a) {
                let foundIdx = -1;
                for (let j = i - 1; j >= 0; j--) {
                    if (columns[j][1] === a && columns[j][0] < col[0]) {
                        foundIdx = j;
                        break;
                    }
                }
                if (foundIdx !== -1 && !used[foundIdx]) {
                    segments.push({
                        start: foundIdx,
                        end: i,
                        cols: columns.slice(foundIdx, i + 1),
                        special: false
                    });
                    used[foundIdx] = true;
                }
            }
        }
        segments.sort((x, y) => x.start - y.start);
        return segments;
    }

    // 延伸字典序：获取段的延伸序列
    function getExtendedSequence(segments, segIdx, a, columns) {
        const result = [...segments[segIdx].cols];
        let currentEnd = segments[segIdx].end;
        const firstRowOfFirstCol = segments[segIdx].cols[0][0];
        const posToSegIdx = new Array(columns.length).fill(-1);
        for (let i = 0; i < segments.length; i++) {
            for (let j = segments[i].start; j <= segments[i].end; j++) {
                posToSegIdx[j] = i;
            }
        }
        let nextPos = currentEnd + 1;
        while (nextPos < columns.length) {
            const nextCol = columns[nextPos];
            if (nextCol[1] > a || nextCol[0] <= firstRowOfFirstCol) {
                break;
            }
            const nextSegIdx = posToSegIdx[nextPos];
            if (nextSegIdx === -1) break;
            const nextSeg = segments[nextSegIdx];
            result.push(...nextSeg.cols);
            nextPos = nextSeg.end + 1;
        }
        return result;
    }

    // 比较两个段的延伸字典序（先规范化再比较）
    function compareExtendedSegments(segments, idxA, idxB, a, columns) {
        const extA = getExtendedSequence(segments, idxA, a, columns);
        const extB = getExtendedSequence(segments, idxB, a, columns);
        const normA = normalizeArray(extA);
        const normB = normalizeArray(extB);
        return compareColumnArrays(normA, normB);
    }

    // 坏根查找（Sudden模式：candFirstFirst > curFirstFirst 跳过，否则加入待定根）
    function findBadRootSudden(segments, lastSegIdx, a, columns) {
        const pendingRoots = [segments[lastSegIdx].start];
        let currentSegIdx = lastSegIdx;
        let currentSeg = segments[currentSegIdx];

        for (let i = lastSegIdx - 1; i >= 0; i--) {
            const candSeg = segments[i];
            if (candSeg.special) continue;

            const candFirstFirst = candSeg.cols[0][0];
            const curFirstFirst = currentSeg.cols[0][0];

            // Sudden 模式：若 candFirstFirst > curFirstFirst 则跳过
            if (candFirstFirst > curFirstFirst) continue;

            // 否则（<=）加入待定根
            pendingRoots.push(candSeg.start);

            // 延伸字典序比较（与末段比较）
            const cmp = compareExtendedSegments(segments, i, lastSegIdx, a, columns);
            const isLess = (cmp < 0);

            if (candFirstFirst < curFirstFirst) {
                if (isLess) {
                    // 找到坏根：上一个加入的待定根
                    if (pendingRoots.length >= 2) {
                        return pendingRoots[pendingRoots.length - 2];
                    } else {
                        return pendingRoots[0];
                    }
                } else {
                    // 更新 currentSeg
                    currentSegIdx = i;
                    currentSeg = candSeg;
                }
            }
            // 若 candFirstFirst == curFirstFirst，不更新 currentSeg，继续循环
        }
        // 未找到坏根，返回最后一个待定根
        return pendingRoots[pendingRoots.length - 1];
    }

    // 情况1：末列第二行为0时的简单坏根查找
    function findBadRootSimple(columns, lastFirst) {
        for (let i = columns.length - 2; i >= 0; i--) {
            if (columns[i][0] < lastFirst) {
                return i;
            }
        }
        return 0;
    }

    // 解析矩阵输入，支持 (x) 或 (x,y)
    function parseMatrixInput(inputStr) {
        const regex = /\((\d+)(?:,(\d+))?\)/g;
        const columns = [];
        let match;
        while ((match = regex.exec(inputStr)) !== null) {
            const x = parseInt(match[1], 10);
            const y = match[2] !== undefined ? parseInt(match[2], 10) : 0;
            columns.push([x, y]);
        }
        return columns;
    }

    // 格式化输出：第二行为0时显示 (x)
    function formatMatrix(columns) {
        return columns.map(col => {
            if (col[1] === 0) return `(${col[0]})`;
            else return `(${col[0]},${col[1]})`;
        }).join('');
    }

    // GPSS2 核心展开逻辑
    function expandGPSS2(columns, times) {
        if (columns.length === 0) {
            return columns;
        }

        const last = columns[columns.length - 1];
        const lastFirst = last[0];
        const lastSecond = last[1];

        // 情况 A：末列第二行为 0
        if (lastSecond === 0) {
            const badRootIdx = findBadRootSimple(columns, lastFirst);
            const d = [0, 0];
            const G = columns.slice(0, badRootIdx);
            const B0 = columns.slice(badRootIdx, columns.length - 1);
            let result = [...G];
            for (let n = 0; n <= times; n++) {
                const Bn = B0.map(col => [col[0] + n * d[0], col[1] + n * d[1]]);
                result.push(...Bn);
            }
            return result;
        }

        // 情况 B：末列第二行为 a+1
        const a = lastSecond - 1;

        const segments = buildSegments(columns, a);
        if (segments.length === 0) {
            return columns;
        }

        // 找到包含末项的段
        const lastPos = columns.length - 1;
        let lastSegIdx = -1;
        for (let i = 0; i < segments.length; i++) {
            if (segments[i].start <= lastPos && segments[i].end >= lastPos) {
                lastSegIdx = i;
                break;
            }
        }
        if (lastSegIdx === -1) {
            return columns;
        }

        const badRootRel = findBadRootSudden(segments, lastSegIdx, a, columns);
        const badRootCol = columns[badRootRel];
        const badRootFirst = badRootCol[0];
        const d = [lastFirst - badRootFirst, 0];

        const G = columns.slice(0, badRootRel);
        const B0 = columns.slice(badRootRel, columns.length - 1);
        let result = [...G];
        for (let n = 0; n <= times; n++) {
            const Bn = B0.map(col => [col[0] + n * d[0], col[1] + n * d[1]]);
            result.push(...Bn);
        }

        return result;
    }

    // 深度比较两个矩阵
    function deepCompareMatrix(a, b) {
        if (!Array.isArray(a) || !Array.isArray(b)) {
            return 0;
        }
        const minLen = Math.min(a.length, b.length);
        for (let i = 0; i < minLen; i++) {
            const cmp = compareColumns(a[i], b[i]);
            if (cmp !== 0) return cmp;
        }
        if (a.length < b.length) return -1;
        if (a.length > b.length) return 1;
        return 0;
    }

    // 判断矩阵是否为limit（需要展开）
    function isLimit(columns) {
        if (!Array.isArray(columns) || columns.length === 0) return false;
        const last = columns[columns.length - 1];
        // 末列第二行为0时，若序列长度大于1，检查是否有小于末列第一行的列
        if (last[1] === 0) {
            for (let i = columns.length - 2; i >= 0; i--) {
                if (columns[i][0] < last[0]) {
                    return true;
                }
            }
            return false;
        }
        // 末列第二行大于0时，通常是limit
        return true;
    }

    // GPSS2 Notation 注册
    register.push({
        id: 'gpss2',
        name: 'GPSS2',

        // display: 将矩阵转换为HTML显示
        display: function(expr) {
            if (expr === null || expr === undefined) {
                return '';
            }
            if (expr === 'Infinity' || expr === Infinity) {
                return '∞';
            }
            if (!Array.isArray(expr)) {
                return String(expr);
            }
            if (expr.length === 0) {
                return '0';
            }
            // 检查是否为 GPSS2 矩阵（二维数组）
            if (Array.isArray(expr[0]) && expr[0].length === 2) {
                return formatMatrix(expr);
            }
            // 降级处理：如果是普通数组，用逗号分隔
            return expr.join(',');
        },

        // able: 判断是否为limit ordinal
        able: function(expr) {
            if (!Array.isArray(expr)) return false;
            if (expr.length === 0) return false;
            // 检查是否为有效的 GPSS2 矩阵
            for (let col of expr) {
                if (!Array.isArray(col) || col.length !== 2) return false;
                if (!Number.isInteger(col[0]) || !Number.isInteger(col[1])) return false;
                if (col[0] < 0 || col[1] < 0) return false;
            }
            return isLimit(expr);
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

            // 空矩阵处理
            if (!Array.isArray(a) || !Array.isArray(b)) {
                if (a === b) return 0;
                return a < b ? -1 : 1;
            }

            if (a.length === 0 && b.length === 0) return 0;
            if (a.length === 0) return -1;
            if (b.length === 0) return 1;

            // 检查是否为矩阵格式
            const isMatrixA = Array.isArray(a[0]) && a[0].length === 2;
            const isMatrixB = Array.isArray(b[0]) && b[0].length === 2;

            if (isMatrixA && isMatrixB) {
                return deepCompareMatrix(a, b);
            }

            // 降级处理
            const strA = String(a);
            const strB = String(b);
            if (strA === strB) return 0;
            return strA < strB ? -1 : 1;
        },

        // FS: 基本序列展开
        FS: function(expr, n) {
            if (!Array.isArray(expr)) return expr;
            if (expr.length === 0) return expr;
            if (!this.able(expr)) return expr;

            // n 为非负整数
            const times = Math.max(0, Math.floor(n));
            return expandGPSS2(expr, times);
        },

        // FSalter: 替代展开方式（Shift+点击），与FS相同
        FSalter: function(expr, n) {
            return this.FS(expr, n);
        },

        // init: 初始化根节点
        init: function() {
            return [
                {
                    expr: Infinity,
                    low: [[[0, 0]]],
                    subitems: []
                },
                {
                    expr: [],
                    low: [[[0, 0]]],
                    subitems: []
                },
                {
                    expr: [[0, 0]],
                    low: [[]],
                    subitems: []
                },
                {
                    expr: [[1, 0]],
                    low: [[[0, 0]]],
                    subitems: []
                },
                {
                    expr: [[0, 1]],
                    low: [[[0, 0]]],
                    subitems: []
                },
                {
                    expr: [[1, 1]],
                    low: [[[0, 1]]],
                    subitems: []
                },
                {
                    expr: [[0, 2]],
                    low: [[[0, 1]]],
                    subitems: []
                }
            ];
        },

        // semiable: 判断是否为半极限
        semiable: function(expr) {
            // GPSS2 没有特殊的半极限概念
            return false;
        }
    });

    console.log('GPSS2 notation registered successfully!');

})();