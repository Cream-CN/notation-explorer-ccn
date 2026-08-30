// GPrSS.js - GPrSS Notation for NE-CCN
// Based on the original GPrSS.html implementation

(function() {
    // 注册到全局 register 数组
    if (typeof register === 'undefined') {
        console.error('GPrSS: register not found. Make sure this script is loaded after framework.js');
        return;
    }

    // 辅助函数：分割序列为严格递增的片段
    function getSegments(arr) {
        const segments = [];
        const startIndices = [];

        if (arr.length === 0) return { segments: [], startIndices: [] };

        let currentSegment = [arr[0]];
        startIndices.push(0);

        for (let i = 1; i < arr.length; i++) {
            if (arr[i] > arr[i - 1]) {
                currentSegment.push(arr[i]);
            } else {
                segments.push(currentSegment);
                currentSegment = [arr[i]];
                startIndices.push(i);
            }
        }
        segments.push(currentSegment);

        return { segments, startIndices };
    }

    // 辅助函数：规范化段（平移使首项为0）
    function normalizeSegment(segment) {
        const firstVal = segment[0];
        return segment.map(val => val - firstVal);
    }

    // 辅助函数：比较两个数组的字典序
    function compareArrays(a, b) {
        const len = Math.min(a.length, b.length);
        for (let i = 0; i < len; i++) {
            if (a[i] < b[i]) return -1;
            if (a[i] > b[i]) return 1;
        }
        if (a.length < b.length) return -1;
        if (a.length > b.length) return 1;
        return 0;
    }

    // GPrSS 核心展开逻辑
    function expandGPrSS(sequence, times) {
        if (sequence.length === 0) {
            return sequence;
        }

        const lastItem = sequence[sequence.length - 1];

        // 如果序列末项为0，直接删去末项
        if (lastItem === 0) {
            return sequence.slice(0, -1);
        }

        // 1. 把序列分割成严格递增的片段
        const segmentsData = getSegments(sequence);
        const segments = segmentsData.segments;
        const startIndices = segmentsData.startIndices;
        const lastSegment = segments[segments.length - 1];

        let badRootIndex = 0;

        // 2. 确定坏根逻辑
        if (lastSegment.length === 1) {
            let roots = [];
            for (let i = 0; i < segments.length; i++) {
                if (segments[i][0] < lastItem) {
                    roots.push(startIndices[i]);
                }
            }
            if (roots.length > 0) {
                badRootIndex = roots[roots.length - 1];
            } else {
                badRootIndex = 0;
            }
        } else {
            let currentSegIndex = segments.length - 1;
            let currentSeg = lastSegment;
            let foundBadRoot = false;

            const normLastSegment = normalizeSegment(lastSegment);

            for (let i = segments.length - 2; i >= 0; i--) {
                const candidateSeg = segments[i];
                const valCurrent = currentSeg[0];
                const valCandidate = candidateSeg[0];

                if (valCandidate > valCurrent) {
                    continue;
                }

                const normCandidate = normalizeSegment(candidateSeg);
                const isLessThanLast = compareArrays(normCandidate, normLastSegment) < 0;

                if (valCandidate === valCurrent) {
                    if (isLessThanLast) {
                        badRootIndex = startIndices[currentSegIndex];
                        foundBadRoot = true;
                        break;
                    }
                } else {
                    if (isLessThanLast) {
                        badRootIndex = startIndices[currentSegIndex];
                        foundBadRoot = true;
                        break;
                    } else {
                        currentSegIndex = i;
                        currentSeg = candidateSeg;
                    }
                }
            }

            if (!foundBadRoot) {
                badRootIndex = startIndices[currentSegIndex];
            }
        }

        // 3. 定义好部和坏部
        const G = sequence.slice(0, badRootIndex);
        const B0 = sequence.slice(badRootIndex, sequence.length - 1);
        const badRootValue = sequence[badRootIndex];

        // 4. 展开计算
        const d = lastSegment.length < 3 ? (lastItem - badRootValue - 1) : (lastSegment[0] - badRootValue + 1);

        let result = [...G];

        for (let n = 0; n <= times; n++) {
            const Bn = B0.map(val => val + n * d);
            result = result.concat(Bn);
        }

        return result;
    }

    // 深度比较两个序列
    function deepCompareArray(a, b) {
        if (!Array.isArray(a) || !Array.isArray(b)) {
            return 0;
        }
        const len = Math.min(a.length, b.length);
        for (let i = 0; i < len; i++) {
            if (a[i] < b[i]) return -1;
            if (a[i] > b[i]) return 1;
        }
        if (a.length < b.length) return -1;
        if (a.length > b.length) return 1;
        return 0;
    }

    // 检查序列是否为空或全为零（作为基础情况）
    function isBaseSequence(seq) {
        if (seq.length === 0) return true;
        return seq.every(v => v === 0);
    }

    // 判断序列是否为limit（需要展开）
    function isLimit(seq) {
        if (seq.length === 0) return false;
        const last = seq[seq.length - 1];
        // 末项为0时，若序列长度大于1，可能是limit（如 [1,0] 的 FS 为 [1, -1] 等）
        // 但在GPrSS中，末项为0直接删去，所以不是limit
        if (last === 0) return false;
        // 末项大于0时，通常是limit
        return true;
    }

    // GPrSS Notation 注册
    register.push({
        id: 'gprss',
        name: 'GPrSS',

        // display: 将序列转换为HTML显示
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
            // 对于大序列，用逗号分隔显示
            return expr.join(',');
        },

        // able: 判断是否为limit ordinal
        able: function(expr) {
            if (!Array.isArray(expr)) return false;
            if (expr.length === 0) return false;
            const last = expr[expr.length - 1];
            // 末项为0时不是limit
            if (last === 0) return false;
            // 检查是否所有元素都是非负整数
            for (let v of expr) {
                if (!Number.isInteger(v) || v < 0) return false;
            }
            return true;
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

            // 空数组视为最小元素
            if (a.length === 0 && b.length === 0) return 0;
            if (a.length === 0) return -1;
            if (b.length === 0) return 1;

            // 字典序比较
            const len = Math.min(a.length, b.length);
            for (let i = 0; i < len; i++) {
                if (a[i] < b[i]) return -1;
                if (a[i] > b[i]) return 1;
            }
            if (a.length < b.length) return -1;
            if (a.length > b.length) return 1;
            return 0;
        },

        // FS: 基本序列展开
        FS: function(expr, n) {
            if (!Array.isArray(expr)) return expr;
            if (expr.length === 0) return expr;
            if (!this.able(expr)) return expr;

            // n 为非负整数
            const times = Math.max(0, Math.floor(n));
            return expandGPrSS(expr, times);
        },

        // FSalter: 替代展开方式（Shift+点击），与FS相同
        FSalter: function(expr, n) {
            return this.FS(expr, n);
        },

        // init: 初始化根节点
        init: function() {
            // 返回根节点列表
            // 包含 Infinity (极限) 和 0 (最小元素)
            return [
                {
                    expr: Infinity,
                    low: [0],
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
                    expr: [1],
                    low: [[0]],
                    subitems: []
                }
            ];
        },

        // semiable: 判断是否为半极限
        semiable: function(expr) {
            // GPrSS 没有特殊的半极限概念
            return false;
        }
    });

    console.log('GPrSS notation registered successfully!');

})();