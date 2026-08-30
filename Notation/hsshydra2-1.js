// HSS-Hydra2.js - HSS Hydra 2 (HydraLike) Notation for NE-CCN
// Based on the original HSS Hydra tree-based expander

(function() {
    // 注册到全局 register 数组
    if (typeof register === 'undefined') {
        console.error('HSS-Hydra2: register not found. Make sure this script is loaded after framework.js');
        return;
    }

    // ---------- 树节点定义 ----------
    class TreeNode {
        constructor(b, depth) {
            this.b = b;           // 第二行数值
            this.depth = depth;   // 第一行数值 (层数)
            this.children = [];   // 子节点列表 (按矩阵顺序)
        }
    }

    // ---------- 矩阵 ↔ 树结构 转换 ----------

    // 从矩阵构建森林 (根节点 depth=0)
    function matrixToForest(matrix) {
        if (!matrix || matrix.length === 0) return [];
        const stack = [];
        const roots = [];
        for (let i = 0; i < matrix.length; i++) {
            const a = matrix[i][0];
            const b = matrix[i][1];
            const node = new TreeNode(b, a);
            while (stack.length > 0 && stack[stack.length - 1].depth >= a) {
                stack.pop();
            }
            if (stack.length === 0) {
                if (a !== 0) throw new Error(`矩阵第 ${i} 列深度为 ${a} 但没有父节点`);
                roots.push(node);
            } else {
                const parent = stack[stack.length - 1];
                if (parent.depth !== a - 1) {
                    throw new Error(`矩阵第 ${i} 列深度为 ${a}，但栈顶深度为 ${parent.depth}，不匹配`);
                }
                parent.children.push(node);
            }
            stack.push(node);
        }
        return roots;
    }

    // 森林前序遍历生成矩阵
    function forestToMatrix(roots) {
        const matrix = [];
        function traverse(node, depth) {
            matrix.push([depth, node.b]);
            for (const child of node.children) {
                traverse(child, depth + 1);
            }
        }
        for (const root of roots) {
            traverse(root, 0);
        }
        return matrix;
    }

    // ---------- 树状字符串 ↔ 森林 转换 ----------

    // 解析树状字符串，返回森林 (根节点数组)
    function parseTreeString(str) {
        const s = str.trim();
        if (s === '') return [];
        let index = 0;

        function parseNode(expectedDepth) {
            if (index >= s.length) return null;
            const match = /^p(\d+)/.exec(s.slice(index));
            if (!match) {
                throw new Error(`在位置 ${index} 期望 'p数字'`);
            }
            const b = parseInt(match[1], 10);
            index += match[0].length;
            const node = new TreeNode(b, expectedDepth);

            if (index < s.length && s[index] === '(') {
                index++;
                if (s[index] !== ')') {
                    while (true) {
                        const child = parseNode(expectedDepth + 1);
                        if (!child) break;
                        node.children.push(child);
                        if (index >= s.length) break;
                        if (s[index] === '+') {
                            index++;
                            continue;
                        } else if (s[index] === ')') {
                            break;
                        } else {
                            throw new Error(`在位置 ${index} 期望 '+' 或 ')'`);
                        }
                    }
                }
                if (index >= s.length || s[index] !== ')') {
                    throw new Error(`在位置 ${index} 期望 ')'`);
                }
                index++;
            }
            return node;
        }

        const roots = [];
        while (index < s.length) {
            const node = parseNode(0);
            if (!node) break;
            roots.push(node);
            if (index < s.length) {
                if (s[index] === '+') {
                    index++;
                    continue;
                } else {
                    throw new Error(`在位置 ${index} 出现意外字符`);
                }
            }
        }
        if (index !== s.length) {
            throw new Error(`解析未完全结束，停在位置 ${index}`);
        }
        return roots;
    }

    // 森林转换为树状字符串
    function forestToString(roots) {
        function nodeToString(node) {
            let str = `p${node.b}`;
            if (node.children.length > 0) {
                const childrenStr = node.children.map(child => nodeToString(child)).join('+');
                str += `(${childrenStr})`;
            }
            return str;
        }
        return roots.map(root => nodeToString(root)).join('+');
    }

    // ---------- 矩阵合法性检查 ----------
    function isValidMatrix(matrix) {
        if (!matrix || matrix.length === 0) return false;
        if (matrix[0][0] !== 0 || matrix[0][1] !== 0) return false;
        for (let i = 0; i < matrix.length; i++) {
            const a = matrix[i][0];
            const b = matrix[i][1];
            if (b > a) return false;
        }
        return true;
    }

    // ---------- HSS Hydra 核心算法 ----------
    function findParent(matrix, colIdx) {
        if (colIdx <= 0) return null;
        const a = matrix[colIdx][0];
        if (a === 0) return null;
        const target = a - 1;
        for (let i = colIdx - 1; i >= 0; i--) {
            if (matrix[i][0] === target) return i;
        }
        return null;
    }

    function ancestors(matrix, colIdx) {
        const result = [];
        let parent = findParent(matrix, colIdx);
        while (parent !== null) {
            result.push(parent);
            parent = findParent(matrix, parent);
        }
        return result;
    }

    function getExamination(matrix, startIdx) {
        const c = matrix[startIdx][0];
        const exam = [];
        for (let i = startIdx; i < matrix.length; i++) {
            exam.push([matrix[i][0] - c, matrix[i][1]]);
        }
        return exam;
    }

    function examLessThan(ex1, ex2) {
        const minLen = Math.min(ex1.length, ex2.length);
        for (let i = 0; i < minLen; i++) {
            const a1 = ex1[i][0], b1 = ex1[i][1];
            const a2 = ex2[i][0], b2 = ex2[i][1];
            if (a1 !== a2) return a1 < a2;
            if (b1 !== b2) return b1 < b2;
        }
        return ex1.length < ex2.length;
    }

    function expandHSS(matrix, n) {
        const T = matrix[matrix.length - 1];
        const aLast = T[0];
        const bLast = T[1];

        if (aLast === 0 && bLast === 0) {
            return { desc: '后继序数', newMatrix: matrix.slice(0, -1) };
        }

        if (bLast === 0) {
            const badIdx = findParent(matrix, matrix.length - 1);
            if (badIdx === null) throw new Error('找不到末列的1-父项');
            const G = matrix.slice(0, badIdx);
            const B = matrix.slice(badIdx, -1);
            const newMatrix = [];
            for (let col of G) newMatrix.push([col[0], col[1]]);
            for (let i = 0; i < n; i++) {
                for (let col of B) newMatrix.push([col[0], col[1]]);
            }
            return { desc: '极限序数', newMatrix };
        }

        const anc = ancestors(matrix, matrix.length - 1);
        const target1 = bLast - 1;
        let primaryCandidate = null;
        for (const idx of anc) {
            if (matrix[idx][1] === target1) {
                primaryCandidate = idx;
                break;
            }
        }
        if (primaryCandidate === null) throw new Error('未找到1-待定根');

        let cutoffIdx = null;
        if (bLast >= 2) {
            const target2 = bLast - 2;
            for (const idx of anc) {
                if (matrix[idx][1] === target2) {
                    cutoffIdx = idx;
                    break;
                }
            }
        }

        const candidateRoots = [];
        for (const idx of anc) {
            if (matrix[idx][1] !== target1) continue;
            if (cutoffIdx !== null && idx <= cutoffIdx) continue;
            candidateRoots.push(idx);
        }
        if (candidateRoots.length === 0) throw new Error('待定根集合为空');

        const exams = new Map();
        for (const idx of candidateRoots) {
            exams.set(idx, getExamination(matrix, idx));
        }
        const baseExam = exams.get(primaryCandidate);

        const smallRoots = [];
        for (const idx of candidateRoots) {
            if (examLessThan(exams.get(idx), baseExam)) {
                smallRoots.push(idx);
            }
        }

        const sortedCandidates = [...candidateRoots].sort((a, b) => a - b);
        const smallSet = new Set(smallRoots);
        let badIdx = null;
        for (const idx of sortedCandidates) {
            if (smallSet.has(idx)) continue;
            const hasLargerSmall = smallRoots.some(s => s > idx);
            if (!hasLargerSmall) {
                badIdx = idx;
                break;
            }
        }
        if (badIdx === null) throw new Error('未找到坏根');

        const G = matrix.slice(0, badIdx);
        const B = matrix.slice(badIdx, -1);
        const d = aLast - matrix[badIdx][0];

        function addDToB(k) {
            const newB = [];
            for (let col of B) {
                newB.push([col[0] + k * d, col[1]]);
            }
            return newB;
        }

        const newMatrix = [];
        for (let col of G) newMatrix.push([col[0], col[1]]);
        for (let col of B) newMatrix.push([col[0], col[1]]);
        for (let k = 1; k <= n; k++) {
            const Bk = addDToB(k);
            for (let col of Bk) newMatrix.push([col[0], col[1]]);
        }
        return { desc: '极限序数', newMatrix };
    }

    // ---------- 比较函数 ----------
    function compareColumns(a, b) {
        if (a[0] !== b[0]) return a[0] - b[0];
        return a[1] - b[1];
    }

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

    // 将矩阵转换为树状字符串（用于显示）
    function matrixToTreeString(matrix) {
        try {
            const forest = matrixToForest(matrix);
            return forestToString(forest);
        } catch (e) {
            // 如果转换失败，返回矩阵的简单表示
            return matrix.map(col => `(${col[0]},${col[1]})`).join('');
        }
    }

    // ---------- 判断是否为limit ----------
    function isLimit(expr) {
        if (!Array.isArray(expr) || expr.length === 0) return false;
        // 检查是否为有效的 HSS 矩阵
        for (let col of expr) {
            if (!Array.isArray(col) || col.length !== 2) return false;
            if (!Number.isInteger(col[0]) || !Number.isInteger(col[1])) return false;
            if (col[0] < 0 || col[1] < 0) return false;
        }
        // 检查合法性
        if (!isValidMatrix(expr)) return false;
        
        const last = expr[expr.length - 1];
        const aLast = last[0];
        const bLast = last[1];
        
        // 如果是 (0,0)，不是limit（是后继）
        if (aLast === 0 && bLast === 0) return false;
        
        // 其他情况都是limit
        return true;
    }

    // ---------- HSS-Hydra2 注册 ----------
    register.push({
        id: 'hss-hydra2',
        name: 'HSS-Hydra 2 (HydraLike)',

        // display: 将表达式转换为HTML显示
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
            
            // 检查是否为矩阵格式
            if (Array.isArray(expr[0]) && expr[0].length === 2) {
                try {
                    // 先检查合法性
                    if (isValidMatrix(expr)) {
                        return matrixToTreeString(expr);
                    }
                } catch (e) {
                    // 如果转换失败，使用矩阵显示
                }
                // 降级显示为矩阵格式
                return expr.map(col => `p${col[1]}`).join('·');
            }
            
            return String(expr);
        },

        // able: 判断是否为limit ordinal
        able: function(expr) {
            if (!Array.isArray(expr)) return false;
            if (expr.length === 0) return false;
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

            // 验证矩阵合法性
            if (!isValidMatrix(expr)) return expr;

            // n 为非负整数
            const times = Math.max(0, Math.floor(n));
            
            try {
                const result = expandHSS(expr, times);
                return result.newMatrix;
            } catch (e) {
                console.warn('HSS-Hydra2 expansion failed:', e);
                return expr;
            }
        },

        // FSalter: 替代展开方式（Shift+点击）
        FSalter: function(expr, n) {
            // 使用相同的展开逻辑，但可能使用不同的n值
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
                    expr: [[0, 0], [1, 0]],
                    low: [[[0, 0]]],
                    subitems: []
                },
                {
                    expr: [[0, 0], [1, 1]],
                    low: [[[0, 0]]],
                    subitems: []
                },
                {
                    expr: [[0, 0], [1, 0], [2, 0]],
                    low: [[[0, 0], [1, 0]]],
                    subitems: []
                }
            ];
        },

        // semiable: 判断是否为半极限
        semiable: function(expr) {
            // HSS-Hydra2 没有特殊的半极限概念
            return false;
        }
    });

    console.log('HSS-Hydra2 (HydraLike) notation registered successfully!');

})();