// dsm.js - Diagonal Sudden Matrix 表示法注册器（完整实现）
// 标识符: dsm, 名称: Diagonal Sudden Matrix

(function(register) {
    'use strict';

    // ---------- 辅助函数 ----------

    // 将字符串解析为矩阵（列优先格式）
    function parseMatrix(inputStr) {
        const colRegex = /\(([^)]*)\)/g;
        let match;
        const columns = [];
        let maxRows = 0;
        while ((match = colRegex.exec(inputStr)) !== null) {
            const content = match[1];
            if (content.trim() === '') columns.push([0]);
            else {
                const nums = content.split(',').map(n => parseInt(n.trim(), 10));
                columns.push(nums.length > 0 && !nums.some(isNaN) ? nums : [0]);
            }
            maxRows = Math.max(maxRows, columns[columns.length - 1].length);
        }
        const matrix = columns.map(col => {
            const newCol = [...col];
            while (newCol.length < maxRows) newCol.push(0);
            return newCol;
        });
        return matrix;
    }

    // 将矩阵格式化为字符串 (列优先)
    function formatMatrix(matrix) {
        if (!matrix || matrix.length === 0) return "";
        return matrix.map(col => {
            let trimmedCol = [...col];
            while (trimmedCol.length > 1 && trimmedCol[trimmedCol.length - 1] === 0) {
                trimmedCol.pop();
            }
            return `(${trimmedCol.join(',')})`;
        }).join('');
    }

    // 修剪列尾部的零
    function trimColumn(col) {
        if (!col || col.length === 0) return [];
        const newCol = [...col];
        while (newCol.length > 1 && newCol[newCol.length - 1] === 0) {
            newCol.pop();
        }
        return newCol;
    }

    // 比较两个矩阵（列优先）
    function compareSegments(matrixA, matrixB) {
        const isInf = (x) => x && x.length === 1 && x[0].length === 1 && x[0][0] === Infinity;
        if (isInf(matrixA) && isInf(matrixB)) return 0;
        if (isInf(matrixA)) return 1;
        if (isInf(matrixB)) return -1;

        if (!matrixA || matrixA.length === 0) {
            if (!matrixB || matrixB.length === 0) return 0;
            return -1;
        }
        if (!matrixB || matrixB.length === 0) return 1;

        const maxCols = Math.max(matrixA.length, matrixB.length);

        for (let c = 0; c < maxCols; c++) {
            const colA = trimColumn(matrixA[c] || []);
            const colB = trimColumn(matrixB[c] || []);

            const maxRows = Math.max(colA.length, colB.length);

            for (let r = 0; r < maxRows; r++) {
                const valA = (r < colA.length) ? colA[r] : 0;
                const valB = (r < colB.length) ? colB[r] : 0;

                if (valA < valB) return -1;
                if (valA > valB) return 1;
            }
        }
        return 0;
    }

    // 获取前驱（用于父矩阵计算）
    function getPredecessor(parents, r, c) {
        if (parents[r][c] !== -1 || r === 0) {
            return null;
        }

        const upRow = r - 1;
        let currCol = parents[upRow][c];
        while (currCol !== -1) {
            if (parents[upRow][currCol] !== -1 && parents[r][currCol] === -1) {
                return { r: r, c: currCol };
            }
            const nextCol = parents[upRow][currCol];
            if (nextCol === -1) {
                return { r: upRow, c: currCol };
            }
            currCol = nextCol;
        }
        return { r: upRow, c: c };
    }

    // 从父矩阵构造值矩阵
    function constructMatrixValues(parents) {
        const cols = parents.length;
        const rows = parents[0].length;
        const matrix = Array.from({ length: cols }, () => Array(rows).fill(0));

        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const p = parents[c][r];
                if (p === -1) {
                    matrix[c][r] = 0;
                } else {
                    matrix[c][r] = matrix[p][r] + 1;
                }
            }
        }
        return matrix;
    }

    // 核心展开函数（返回值矩阵）
    function generateExpansion(parents, badRow, badCol, times) {
        const rows = parents[0].length;
        const cols = parents.length;
        const lastCol = cols - 1;

        let targetRow = -1;
        for (let r = rows - 1; r >= 0; r--) {
            if (parents[lastCol][r] !== -1) {
                targetRow = r;
                break;
            }
        }
        if (targetRow === -1) {
            return null;
        }

        const S = badCol;
        const E = lastCol;
        const segmentDist = E - S;

        let finalParentsMatrix = null;

        if (targetRow === badRow) {
            // 小展开
            const parentsRowMajor = Array.from({ length: rows }, () => Array(cols).fill(-1));
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    parentsRowMajor[r][c] = parents[c][r];
                }
            }

            let expandedParentsRowMajor = Array.from({ length: rows }, () => []);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    expandedParentsRowMajor[r].push(parentsRowMajor[r][c]);
                }
            }

            for (let i = 1; i <= times; i++) {
                const shiftAmount = i * segmentDist;
                for (let c = S; c <= E; c++) {
                    const newC = c + shiftAmount;
                    const currentLen = expandedParentsRowMajor[0].length;
                    for (let r = 0; r < rows; r++) {
                        const originalParent = parentsRowMajor[r][c];
                        let newParent = originalParent;
                        if (c === S && r < targetRow) {
                            newParent = parentsRowMajor[r][E] + shiftAmount - segmentDist;
                        } else if (originalParent >= badCol) {
                            newParent = originalParent + shiftAmount;
                        }
                        if (newC < currentLen) {
                            expandedParentsRowMajor[r][newC] = newParent;
                        } else {
                            expandedParentsRowMajor[r].push(newParent);
                        }
                    }
                }
            }

            finalParentsMatrix = Array.from({ length: expandedParentsRowMajor[0].length }, () => Array(rows).fill(-1));
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < expandedParentsRowMajor[r].length; c++) {
                    finalParentsMatrix[c][r] = expandedParentsRowMajor[r][c];
                }
            }
        } else {
            // 完整展开
            const parentsRM = Array.from({ length: rows }, () => Array(cols).fill(-1));
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    parentsRM[r][c] = parents[c][r];
                }
            }

            let currentCols = cols;
            let resultRM = Array.from({ length: rows }, () => Array(cols).fill(-1));
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    resultRM[r][c] = parentsRM[r][c];
                }
            }

            // 步骤1：生成上半部分
            for (let i = 1; i <= times; i++) {
                const shiftAmount = i * segmentDist;
                for (let c = S + 1; c <= E; c++) {
                    for (let r = 0; r < rows; r++) {
                        const newParentVal = !(r === targetRow && c === E) ?
                            (() => {
                                const originalParent = parentsRM[r][c];
                                return (originalParent >= badCol) ? originalParent + shiftAmount : originalParent;
                            })() : -1;
                        resultRM[r].push(newParentVal);
                    }
                }
            }
            currentCols = resultRM[0].length;

            // 步骤2：识别 Rising 和 Base 项
            const parentCol = parentsRM[targetRow][lastCol];
            const validCandidates = [];
            let scanNode = { r: targetRow, c: parentCol };
            while (true) {
                if (scanNode.r === badRow && scanNode.c > badCol) {
                    validCandidates.push(scanNode);
                }
                const pred = getPredecessor(parentsRM, scanNode.r, scanNode.c);
                if (pred === null) break;
                scanNode = pred;
            }

            const isRising = Array.from({ length: rows }, () => Array(cols).fill(false));
            const isBase = Array.from({ length: rows }, () => Array(cols).fill(false));
            for (let vc of validCandidates) {
                if (vc.r < rows && vc.c < cols) {
                    isRising[vc.r][vc.c] = true;
                    isBase[vc.r][vc.c] = true;
                }
            }

            // Rising 迭代填充
            isRising[badRow][badCol] = true;
            let changed = true;
            while (changed) {
                changed = false;
                for (let r = badRow; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        if (isRising[r][c]) continue;
                        let becomeRising = false;
                        const p = parentsRM[r][c];
                        if (p !== -1 && isRising[r][p]) becomeRising = true;
                        if (!becomeRising && r > badRow) {
                            const upP = parentsRM[r - 1][c];
                            if (upP !== -1 && isRising[r - 1][upP]) becomeRising = true;
                        }
                        if (!becomeRising && r < rows - 1) {
                            if (isRising[r + 1][c]) becomeRising = true;
                        }
                        if (becomeRising) {
                            isRising[r][c] = true;
                            changed = true;
                        }
                    }
                }
            }

            // Base 项 BFS
            const queueBase = [];
            for (let c = 0; c < cols; c++) {
                if (parentsRM[badRow][c] === badCol) {
                    isBase[badRow][c] = true;
                }
                if (isBase[badRow][c]) {
                    queueBase.push(c);
                }
            }
            while (queueBase.length > 0) {
                const currParentCol = queueBase.shift();
                for (let c = 0; c < cols; c++) {
                    if (parentsRM[badRow][c] === currParentCol && !isBase[badRow][c]) {
                        isBase[badRow][c] = true;
                        queueBase.push(c);
                    }
                }
            }

            // 步骤3：Rising 展开
            const R = targetRow - badRow;
            const C = lastCol - badCol;
            const finalRows = rows + (R * times);
            const finalCols = currentCols;

            for (let r = rows; r < finalRows; r++) {
                resultRM.push(Array(finalCols).fill(-1));
            }

            for (let i = 1; i <= times; i++) {
                const rowShift = R * i;
                const colShift = C * i;

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        if (isRising[r][c]) {
                            const newR = r + rowShift;
                            const newC = c + colShift;
                            let val = parentsRM[r][c];
                            if (val !== -1) {
                                val = val + colShift;
                            }
                            resultRM[newR][newC] = val;
                        }
                    }
                }

                for (let c = 0; c < cols; c++) {
                    if (isBase[badRow][c]) {
                        const newC = c + colShift;
                        const baseParent = parentsRM[badRow][c];
                        const newBaseParent = (baseParent !== -1) ? baseParent + colShift : badCol + colShift;
                        for (let k = 0; k < rowShift; k++) {
                            const newR = badRow + k;
                            resultRM[newR][newC] = newBaseParent;
                        }
                    }
                }
            }

            finalParentsMatrix = Array.from({ length: resultRM[0].length }, () => Array(resultRM.length).fill(-1));
            for (let r = 0; r < resultRM.length; r++) {
                for (let c = 0; c < resultRM[0].length; c++) {
                    finalParentsMatrix[c][r] = resultRM[r][c];
                }
            }
        }

        return constructMatrixValues(finalParentsMatrix);
    }

    // 主展开函数：给定矩阵 expr 和自然数 n，返回第 n 个基本序列项
    // keepLast: 是否保留最后一列（false 表示删除最后一列，即 FS 行为；true 表示完整保留，即 FSalter 行为）
    function expandMatrix(expr, n, keepLast = false) {
        if (!expr || expr.length === 0) return [];

        // 处理伪极限
        if (expr.length === 1 && expr[0].length === 1 && expr[0][0] === Infinity) {
            // 生成 [0], [1], ..., [n] 或 [n+1] 取决于 keepLast
            const result = [];
            const limit = keepLast ? n + 1 : n;
            for (let i = 0; i <= limit; i++) {
                result.push([i]);
            }
            return result;
        }

        const originalMatrix = expr;
        const rows = originalMatrix[0] ? originalMatrix[0].length : 0;
        const cols = originalMatrix.length;

        if (cols === 0) return [];

        // 检查最后一列是否全零
        const lastColIdx = cols - 1;
        const isLastColZero = originalMatrix[lastColIdx].every(val => val === 0);
        if (isLastColZero) {
            // 删除最后一列
            return originalMatrix.slice(0, lastColIdx);
        }

        // 计算父矩阵（行优先）
        const matrixRM = Array.from({ length: rows }, () => Array(cols).fill(0));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                matrixRM[r][c] = originalMatrix[c][r];
            }
        }

        const parents = Array.from({ length: rows }, () => Array(cols).fill(-1));
        for (let c = 1; c < cols; c++) {
            const val = matrixRM[0][c];
            for (let k = c - 1; k >= 0; k--) {
                if (matrixRM[0][k] < val) { parents[0][c] = k; break; }
            }
        }
        for (let r = 1; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const val = matrixRM[r][c];
                let chainIndex = c;
                while (chainIndex !== -1) {
                    if (chainIndex !== c && matrixRM[r][chainIndex] < val) {
                        parents[r][c] = chainIndex;
                        break;
                    }
                    chainIndex = parents[r - 1][chainIndex];
                }
            }
        }

        // 找目标项（最后一列中有父的最大行）
        let targetRow = -1;
        let targetCol = cols - 1;
        for (let r = rows - 1; r >= 0; r--) {
            if (parents[r][targetCol] !== -1) {
                targetRow = r;
                break;
            }
        }
        if (targetRow === -1) {
            // 没有父项，视为后继
            return originalMatrix.slice(0, -1);
        }

        const parentCol = parents[targetRow][targetCol];
        if (parentCol === -1) {
            return originalMatrix.slice(0, -1);
        }

        // 构建候选池和选项
        let candidatesPool = [];
        let currItem = { r: targetRow, c: parentCol };
        candidatesPool.push(currItem);
        while (true) {
            const pred = getPredecessor(parents, currItem.r, currItem.c);
            if (pred === null) break;
            candidatesPool.push(pred);
            currItem = pred;
        }

        let options = [];
        candidatesPool.sort((a, b) => b.c - a.c);
        let prevItemForOptions = { r: targetRow, c: targetCol };
        for (let item of candidatesPool) {
            if (item.r < prevItemForOptions.r) {
                options.push(item);
                prevItemForOptions = item;
            }
        }
        if (candidatesPool.length === 0 && parentCol !== -1) {
            options.push({ r: targetRow, c: parentCol });
        }

        // 将父矩阵转为列优先
        const parentsColMajor = Array.from({ length: cols }, () => Array(rows).fill(-1));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                parentsColMajor[c][r] = parents[r][c];
            }
        }

        // 确定 bad item
        let badItem = null;
        if (options.length === 0) {
            badItem = { r: targetRow, c: parentCol };
        } else {
            const standardSeg = generateExpansion(parentsColMajor, targetRow, parentCol, 1);
            let foundBadItem = false;
            for (let cand of candidatesPool) {
                const candSeg = generateExpansion(parentsColMajor, cand.r, cand.c, 1);
                if (compareSegments(candSeg, standardSeg) < 0) {
                    let rightOptions = options.filter(opt => opt.c > cand.c);
                    if (rightOptions.length > 0) {
                        rightOptions.sort((a, b) => a.c - b.c);
                        badItem = rightOptions[0];
                    } else {
                        badItem = options[options.length - 1];
                    }
                    foundBadItem = true;
                    break;
                }
            }
            if (!foundBadItem) {
                badItem = options[options.length - 1];
            }
        }

        // 执行最终展开
        const fullExpanded = generateExpansion(parentsColMajor, badItem.r, badItem.c, n);
        if (!fullExpanded) return originalMatrix;

        // 根据 keepLast 决定是否删除最后一列
        if (!keepLast) {
            fullExpanded.pop();
        }
        return fullExpanded;
    }

    // ---------- 表示法注册 ----------

    // 判断是否为极限
    function able(expr) {
        if (!expr || expr.length === 0) return false;
        if (expr.length === 1 && expr[0].length === 1 && expr[0][0] === Infinity) {
            return true;
        }
        const lastCol = expr[expr.length - 1];
        if (lastCol.every(v => v === 0)) return false;

        const rows = expr[0] ? expr[0].length : 0;
        const cols = expr.length;
        if (rows === 0 || cols === 0) return false;

        // 构建父矩阵（简化，仅用于判断）
        const matrixRM = Array.from({ length: rows }, () => Array(cols).fill(0));
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                matrixRM[r][c] = expr[c][r];
            }
        }
        const parents = Array.from({ length: rows }, () => Array(cols).fill(-1));
        for (let c = 1; c < cols; c++) {
            const val = matrixRM[0][c];
            for (let k = c - 1; k >= 0; k--) {
                if (matrixRM[0][k] < val) { parents[0][c] = k; break; }
            }
        }
        for (let r = 1; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const val = matrixRM[r][c];
                let chainIndex = c;
                while (chainIndex !== -1) {
                    if (chainIndex !== c && matrixRM[r][chainIndex] < val) {
                        parents[r][c] = chainIndex;
                        break;
                    }
                    chainIndex = parents[r - 1][chainIndex];
                }
            }
        }

        const lastColIdx = cols - 1;
        for (let r = rows - 1; r >= 0; r--) {
            if (parents[r][lastColIdx] !== -1) return true;
        }
        return false;
    }

    // ---------- 注册条目 ----------
    register.push({
        id: 'dsm',
        name: 'Diagonal Sudden Matrix',

        // display: 将矩阵转为字符串
        display: function(expr) {
            if (!expr || expr.length === 0) return '0';
            if (expr.length === 1 && expr[0].length === 1 && expr[0][0] === Infinity) {
                return 'Limit';
            }
            return formatMatrix(expr);
        },

        // able: 判断是否为极限
        able: able,

        // compare: 比较两个矩阵
        compare: function(a, b) {
            const isInf = (x) => x && x.length === 1 && x[0].length === 1 && x[0][0] === Infinity;
            if (isInf(a) && isInf(b)) return 0;
            if (isInf(a)) return 1;
            if (isInf(b)) return -1;
            return compareSegments(a, b);
        },

        // FS: 基本序列展开，返回第 n 项（删除最后一列）
        FS: (function() {
            var cache = {};
            return function(expr, n) {
                if (n < 0) n = 0;
                if (expr && expr.length === 1 && expr[0].length === 1 && expr[0][0] === Infinity) {
                    const result = [];
                    for (let i = 0; i <= n; i++) {
                        result.push([i]);
                    }
                    return result;
                }
                if (!expr || expr.length === 0) return [];

                var key = JSON.stringify(expr) + '@' + n;
                if (cache[key]) return cache[key];

                var result = expandMatrix(expr, n, false);
                cache[key] = result;
                return result;
            };
        })(),

        // FSalter: 备用展开（完整展开，保留最后一列）
        FSalter: (function() {
            var cache = {};
            return function(expr, n) {
                if (n < 0) n = 0;
                if (expr && expr.length === 1 && expr[0].length === 1 && expr[0][0] === Infinity) {
                    const result = [];
                    for (let i = 0; i <= n + 1; i++) {
                        result.push([i]);
                    }
                    return result;
                }
                if (!expr || expr.length === 0) return [];

                var key = JSON.stringify(expr) + '@' + n + '_full';
                if (cache[key]) return cache[key];

                var result = expandMatrix(expr, n, true);
                cache[key] = result;
                return result;
            };
        })(),

        // init: 返回初始数据集
        init: function() {
            return [
                { expr: [[Infinity]], low: [[[0]]], subitems: [] },
                { expr: [[0], [1]], low: [[[0]]], subitems: [] },
                { expr: [[0]], low: [[[0]]], subitems: [] },
                { expr: [], low: [[[]]], subitems: [] }
            ];
        },

        // semiable: 判断是否为半极限（可选）
        semiable: function(expr) {
            if (!expr || expr.length === 0) return false;
            if (expr.length === 1 && expr[0].length === 1 && expr[0][0] === Infinity) return true;
            const lastCol = expr[expr.length - 1];
            if (lastCol.every(v => v === 0)) return false;
            return true;
        }
    });

    console.log('[dsm] Diagonal Sudden Matrix 表示法已注册（完整实现）。');
})(window.register || (window.register = []));