// pps-prrs.js - PPS/PRRS 系列表示法注册器（精确实现）
// 包含: (UNOFFICIAL) PPS3.4, PPS3.5, PPS3.5β, PPS3.6, PPS4.1, PPS4, PRRS, PRRS1.2


(function(register) {
    'use strict';

    // ---------- 公共辅助函数 ----------

    function sequence_display(expr) {
        if (!expr || expr.length === 0) return '0';
        if (expr === Infinity || (Array.isArray(expr) && expr.length === 1 && expr[0] === Infinity)) {
            return 'Limit';
        }
        return expr.join(', ');
    }

    function sequence_compare(a, b) {
        if (a.length === 0) {
            if (b.length === 0) return 0;
            return -1;
        }
        if (b.length === 0) return 1;
        if (a[0] < b[0]) return -1;
        if (a[0] > b[0]) return 1;
        return sequence_compare(a.slice(1), b.slice(1));
    }

    function able_default(expr) {
        if (!expr || expr.length === 0) return false;
        if (expr === Infinity || (Array.isArray(expr) && expr.length === 1 && expr[0] === Infinity)) {
            return true;
        }
        return expr[expr.length - 1] > 0;
    }

    function init_general() {
        return [
            { expr: [Infinity], low: [[0]], subitems: [] },
            { expr: [0], low: [[0]], subitems: [] }
        ];
    }

    // ---------- 各版本的 FS 实现（精确翻译自 HTML） ----------

    // -------- (UNOFFICIAL) PPS3.4 --------
    function fs_pps34(seq, n) {
        if (!seq || seq.length === 0) return [];
        if (seq[seq.length - 1] === 0) return seq.slice(0, -1);
        if (seq === Infinity || (Array.isArray(seq) && seq.length === 1 && seq[0] === Infinity)) {
            var res = [];
            for (var i = 0; i <= n; i++) res.push(i);
            return res;
        }

        var y = seq.length;
        var x = seq[y - 1];
        var badRootIndex = x - 1;
        var b = seq[badRootIndex];
        var originalL = y - x;
        var currentL = originalL;
        var newSeq = seq.slice(0, y - 1);
        var isRule1 = false;

        // 规则1：originalL === 1
        if (originalL === 1) {
            isRule1 = true;
            // 划分 parts，分隔符为 <= b
            var parts = [];
            var currentPart = { start: -1, length: 0 };
            for (var i = 0; i < seq.length; i++) {
                if (seq[i] > b) {
                    if (currentPart.start === -1) currentPart.start = i;
                    currentPart.length++;
                } else {
                    if (currentPart.length > 0) {
                        parts.push({ start: currentPart.start, length: currentPart.length });
                        currentPart = { start: -1, length: 0 };
                    }
                }
            }
            if (currentPart.length > 0) parts.push({ start: currentPart.start, length: currentPart.length });

            // 找最后一个部分
            var lastItemIndex = y - 1;
            var lastPartRef = null;
            for (var p = 0; p < parts.length; p++) {
                if (lastItemIndex >= parts[p].start && lastItemIndex < parts[p].start + parts[p].length) {
                    lastPartRef = parts[p];
                    break;
                }
            }
            // 其他部分的最小长度
            var otherLengths = [];
            for (var p = 0; p < parts.length; p++) {
                if (parts[p] !== lastPartRef) {
                    otherLengths.push(parts[p].length);
                }
            }
            var k = 0;
            if (otherLengths.length > 0) {
                k = Math.min.apply(null, otherLengths);
            }
            for (var j = 0; j < k; j++) newSeq.push(x - 1);
            currentL = k + 1;
        } else {
            // 规则2
            var stdVal;
            var foundB = false;
            if (y - 1 > x) {
                for (var kk = x; kk < y - 1; kk++) {
                    if (seq[kk] === b) { foundB = true; break; }
                }
            }
            stdVal = foundB ? b : x - 1;

            // 触发规则2的条件：用0分割，检查rootPart和lastPart
            var triggerRule2 = false;
            var parts2 = [];
            var currentPart2 = { start: -1, length: 0 };
            for (var i2 = 0; i2 < seq.length; i2++) {
                if (seq[i2] !== 0) {
                    if (currentPart2.start === -1) currentPart2.start = i2;
                    currentPart2.length++;
                } else {
                    if (currentPart2.length > 0) {
                        parts2.push({ start: currentPart2.start, length: currentPart2.length });
                        currentPart2 = { start: -1, length: 0 };
                    }
                }
            }
            if (currentPart2.length > 0) parts2.push({ start: currentPart2.start, length: currentPart2.length });

            // 找 rootPart 和 lastPart
            var rootPart = null;
            for (var p2 = 0; p2 < parts2.length; p2++) {
                var part = parts2[p2];
                if (badRootIndex >= part.start && badRootIndex < part.start + part.length) {
                    rootPart = part;
                    break;
                }
            }
            var lastPart = null;
            for (var p3 = 0; p3 < parts2.length; p3++) {
                var part = parts2[p3];
                if ((y - 1) >= part.start && (y - 1) < part.start + part.length) {
                    lastPart = part;
                    break;
                }
            }
            if (rootPart && lastPart && rootPart !== lastPart) {
                var maxLen = 0;
                for (var p4 = 0; p4 < parts2.length; p4++) {
                    if (parts2[p4] !== lastPart) {
                        if (parts2[p4].length > maxLen) maxLen = parts2[p4].length;
                    }
                }
                var rootPartStartVal = rootPart.start + 1;
                if (rootPart.length === maxLen && maxLen >= 2 &&
                    lastPart.length >= rootPart.length &&
                    stdVal < rootPartStartVal) {
                    triggerRule2 = true;
                }
            }

            if (triggerRule2) {
                newSeq.push(0);
            } else {
                newSeq.push(stdVal);
            }
        }

        // 循环复制
        var targetLength = y + (n * currentL) - 1;
        while (newSeq.length < targetLength) {
            var idx = newSeq.length;
            var srcIdx = idx - currentL;
            if (srcIdx < 0) { newSeq.push(0); continue; }
            var srcVal = newSeq[srcIdx];
            var val;
            if (isRule1) {
                val = (srcVal !== b) ? (srcVal + currentL) : srcVal;
            } else {
                val = (srcVal >= x) ? (srcVal + currentL) : srcVal;
            }
            newSeq.push(val);
        }
        return newSeq;
    }

    // -------- (UNOFFICIAL) PPS3.5 --------
    function fs_pps35(seq, n) {
        if (!seq || seq.length === 0) return [];
        if (seq[seq.length - 1] === 0) return seq.slice(0, -1);
        if (seq === Infinity || (Array.isArray(seq) && seq.length === 1 && seq[0] === Infinity)) {
            var res = [];
            for (var i = 0; i <= n; i++) res.push(i);
            return res;
        }

        var y = seq.length;
        var x = seq[y - 1];
        var badRootIndex = x - 1;
        var b = seq[badRootIndex];
        var originalL = y - x;
        var currentL = originalL;
        var newSeq = seq.slice(0, y - 1);
        var isRule1 = false;

        if (originalL === 1) {
            isRule1 = true;
            var parts = [];
            var currentPart = { start: -1, length: 0 };
            for (var i = 0; i < seq.length; i++) {
                if (seq[i] > b) {
                    if (currentPart.start === -1) currentPart.start = i;
                    currentPart.length++;
                } else {
                    if (currentPart.length > 0) {
                        parts.push({ start: currentPart.start, length: currentPart.length });
                        currentPart = { start: -1, length: 0 };
                    }
                }
            }
            if (currentPart.length > 0) parts.push({ start: currentPart.start, length: currentPart.length });

            var lastItemIndex = y - 1;
            var lastPartRef = null;
            for (var p = 0; p < parts.length; p++) {
                if (lastItemIndex >= parts[p].start && lastItemIndex < parts[p].start + parts[p].length) {
                    lastPartRef = parts[p];
                    break;
                }
            }
            var otherLengths = [];
            for (var p = 0; p < parts.length; p++) {
                if (parts[p] !== lastPartRef) {
                    otherLengths.push(parts[p].length);
                }
            }
            var k = 0;
            if (otherLengths.length > 0) {
                k = Math.min.apply(null, otherLengths);
            }
            for (var j = 0; j < k; j++) newSeq.push(x - 1);
            currentL = k + 1;
        } else {
            var stdVal;
            var foundB = false;
            if (y - 1 > x) {
                for (var kk = x; kk < y - 1; kk++) {
                    if (seq[kk] === b) { foundB = true; break; }
                }
            }
            stdVal = foundB ? b : x - 1;

            var triggerRule2 = false;
            var limitVal;
            if (stdVal >= 1 && stdVal <= seq.length) {
                limitVal = seq[stdVal - 1];
                var parts2 = [];
                var currentPart2 = { start: -1, length: 0 };
                // 分隔符为 <= limitVal
                for (var i2 = 0; i2 < seq.length; i2++) {
                    if (seq[i2] > limitVal) {
                        if (currentPart2.start === -1) currentPart2.start = i2;
                        currentPart2.length++;
                    } else {
                        if (currentPart2.length > 0) {
                            parts2.push({ start: currentPart2.start, length: currentPart2.length });
                            currentPart2 = { start: -1, length: 0 };
                        }
                    }
                }
                if (currentPart2.length > 0) parts2.push({ start: currentPart2.start, length: currentPart2.length });

                var rootPart = null;
                for (var p2 = 0; p2 < parts2.length; p2++) {
                    var part = parts2[p2];
                    if (badRootIndex >= part.start && badRootIndex < part.start + part.length) {
                        rootPart = part;
                        break;
                    }
                }
                var lastPart = null;
                for (var p3 = 0; p3 < parts2.length; p3++) {
                    var part = parts2[p3];
                    if ((y - 1) >= part.start && (y - 1) < part.start + part.length) {
                        lastPart = part;
                        break;
                    }
                }
                if (rootPart && lastPart && rootPart !== lastPart) {
                    var maxLen = 0;
                    for (var p4 = 0; p4 < parts2.length; p4++) {
                        if (parts2[p4] !== lastPart) {
                            if (parts2[p4].length > maxLen) maxLen = parts2[p4].length;
                        }
                    }
                    // 条件：rootPart.length === maxLen && maxLen >= 2
                    if (rootPart.length === maxLen && maxLen >= 2) {
                        triggerRule2 = true;
                    }
                }
            }
            if (triggerRule2) {
                newSeq.push(limitVal);
            } else {
                newSeq.push(stdVal);
            }
        }

        var targetLength = y + (n * currentL) - 1;
        while (newSeq.length < targetLength) {
            var idx = newSeq.length;
            var srcIdx = idx - currentL;
            if (srcIdx < 0) { newSeq.push(0); continue; }
            var srcVal = newSeq[srcIdx];
            var val;
            if (isRule1) {
                val = (srcVal !== b) ? (srcVal + currentL) : srcVal;
            } else {
                val = (srcVal >= x) ? (srcVal + currentL) : srcVal;
            }
            newSeq.push(val);
        }
        return newSeq;
    }

    // -------- (UNOFFICIAL) PPS3.5β --------
    function fs_pps35beta(seq, n) {
        if (!seq || seq.length === 0) return [];
        if (seq[seq.length - 1] === 0) return seq.slice(0, -1);
        if (seq === Infinity || (Array.isArray(seq) && seq.length === 1 && seq[0] === Infinity)) {
            var res = [];
            for (var i = 0; i <= n; i++) res.push(i);
            return res;
        }

        var y = seq.length;
        var x = seq[y - 1];
        var badRootIndex = x - 1;
        var b = seq[badRootIndex];
        var originalL = y - x;
        var currentL = originalL;
        var newSeq = seq.slice(0, y - 1);
        var isRule1 = false;

        if (originalL === 1) {
            isRule1 = true;
            var parts = [];
            var currentPart = { start: -1, length: 0 };
            for (var i = 0; i < seq.length; i++) {
                if (seq[i] > b) {
                    if (currentPart.start === -1) currentPart.start = i;
                    currentPart.length++;
                } else {
                    if (currentPart.length > 0) {
                        parts.push({ start: currentPart.start, length: currentPart.length });
                        currentPart = { start: -1, length: 0 };
                    }
                }
            }
            if (currentPart.length > 0) parts.push({ start: currentPart.start, length: currentPart.length });

            var lastItemIndex = y - 1;
            var lastPartRef = null;
            for (var p = 0; p < parts.length; p++) {
                if (lastItemIndex >= parts[p].start && lastItemIndex < parts[p].start + parts[p].length) {
                    lastPartRef = parts[p];
                    break;
                }
            }
            var otherLengths = [];
            for (var p = 0; p < parts.length; p++) {
                if (parts[p] !== lastPartRef) {
                    otherLengths.push(parts[p].length);
                }
            }
            var k = 0;
            if (otherLengths.length > 0) {
                k = Math.min.apply(null, otherLengths);
            }
            for (var j = 0; j < k; j++) newSeq.push(x - 1);
            currentL = k + 1;
        } else {
            var stdVal;
            var foundB = false;
            if (y - 1 > x) {
                for (var kk = x; kk < y - 1; kk++) {
                    if (seq[kk] === b) { foundB = true; break; }
                }
            }
            stdVal = foundB ? b : x - 1;

            var triggerRule2 = false;
            var limitVal;
            if (stdVal >= 1 && stdVal <= seq.length) {
                limitVal = seq[stdVal - 1];
                var parts2 = [];
                var currentPart2 = { start: -1, length: 0 };
                for (var i2 = 0; i2 < seq.length; i2++) {
                    if (seq[i2] > limitVal) {
                        if (currentPart2.start === -1) currentPart2.start = i2;
                        currentPart2.length++;
                    } else {
                        if (currentPart2.length > 0) {
                            parts2.push({ start: currentPart2.start, length: currentPart2.length });
                            currentPart2 = { start: -1, length: 0 };
                        }
                    }
                }
                if (currentPart2.length > 0) parts2.push({ start: currentPart2.start, length: currentPart2.length });

                var rootPart = null;
                for (var p2 = 0; p2 < parts2.length; p2++) {
                    var part = parts2[p2];
                    if (badRootIndex >= part.start && badRootIndex < part.start + part.length) {
                        rootPart = part;
                        break;
                    }
                }
                var lastPart = null;
                for (var p3 = 0; p3 < parts2.length; p3++) {
                    var part = parts2[p3];
                    if ((y - 1) >= part.start && (y - 1) < part.start + part.length) {
                        lastPart = part;
                        break;
                    }
                }
                if (rootPart && lastPart && rootPart !== lastPart) {
                    var maxLen = 0;
                    for (var p4 = 0; p4 < parts2.length; p4++) {
                        if (parts2[p4] !== lastPart) {
                            if (parts2[p4].length > maxLen) maxLen = parts2[p4].length;
                        }
                    }
                    // 条件：加上 lastPart.length >= rootPart.length
                    if (rootPart.length === maxLen && maxLen >= 2 &&
                        lastPart.length >= rootPart.length) {
                        triggerRule2 = true;
                    }
                }
            }
            if (triggerRule2) {
                newSeq.push(limitVal);
            } else {
                newSeq.push(stdVal);
            }
        }

        var targetLength = y + (n * currentL) - 1;
        while (newSeq.length < targetLength) {
            var idx = newSeq.length;
            var srcIdx = idx - currentL;
            if (srcIdx < 0) { newSeq.push(0); continue; }
            var srcVal = newSeq[srcIdx];
            var val;
            if (isRule1) {
                val = (srcVal !== b) ? (srcVal + currentL) : srcVal;
            } else {
                val = (srcVal >= x) ? (srcVal + currentL) : srcVal;
            }
            newSeq.push(val);
        }
        return newSeq;
    }

    // -------- (UNOFFICIAL) PPS3.6 --------
    function fs_pps36(seq, n) {
        if (!seq || seq.length === 0) return [];
        if (seq[seq.length - 1] === 0) return seq.slice(0, -1);
        if (seq === Infinity || (Array.isArray(seq) && seq.length === 1 && seq[0] === Infinity)) {
            var res = [];
            for (var i = 0; i <= n; i++) res.push(i);
            return res;
        }

        function shouldResetRecursionVal(val, seq) {
            if (val <= 0 || val > seq.length) return false;
            var limit = seq[val - 1];
            var y = seq.length;
            var parts = [];
            var currentPart = { start: -1, length: 0 };
            for (var i = 0; i < y; i++) {
                if (seq[i] > limit) {
                    if (currentPart.start === -1) currentPart.start = i;
                    currentPart.length++;
                } else {
                    if (currentPart.length > 0) {
                        parts.push({ start: currentPart.start, length: currentPart.length });
                        currentPart = { start: -1, length: 0 };
                    }
                }
            }
            if (currentPart.length > 0) parts.push({ start: currentPart.start, length: currentPart.length });

            var lastItemIndex = y - 1;
            var lastPart = null;
            for (var p = 0; p < parts.length; p++) {
                if (lastItemIndex >= parts[p].start && lastItemIndex < parts[p].start + parts[p].length) {
                    lastPart = parts[p];
                    break;
                }
            }
            if (!lastPart) return false;
            var maxOtherLen = 0;
            var existsGreaterEqual = false;
            for (var p = 0; p < parts.length; p++) {
                if (parts[p] !== lastPart) {
                    if (parts[p].length > maxOtherLen) maxOtherLen = parts[p].length;
                    if (parts[p].length >= lastPart.length) {
                        existsGreaterEqual = true;
                    }
                }
            }
            return (existsGreaterEqual && maxOtherLen >= 2);
        }

        var y = seq.length;
        var x = seq[y - 1];
        var badRootIndex = x - 1;
        var b = seq[badRootIndex];
        var originalL = y - x;
        var currentL = originalL;
        var newSeq = seq.slice(0, y - 1);
        var isRule1 = false;
        var rule1K = 0;

        if (originalL === 1) {
            isRule1 = true;
            var parts = [];
            var currentPart = { start: -1, length: 0 };
            for (var i = 0; i < seq.length; i++) {
                if (seq[i] > b) {
                    if (currentPart.start === -1) currentPart.start = i;
                    currentPart.length++;
                } else {
                    if (currentPart.length > 0) {
                        parts.push({ start: currentPart.start, length: currentPart.length });
                        currentPart = { start: -1, length: 0 };
                    }
                }
            }
            if (currentPart.length > 0) parts.push({ start: currentPart.start, length: currentPart.length });

            var lastItemIndex = y - 1;
            var lastPartRef = null;
            for (var p = 0; p < parts.length; p++) {
                if (lastItemIndex >= parts[p].start && lastItemIndex < parts[p].start + parts[p].length) {
                    lastPartRef = parts[p];
                    break;
                }
            }
            // 找最小长度的部分（非最后）
            var minPart = null;
            var minLen = Infinity;
            for (var p = 0; p < parts.length; p++) {
                if (parts[p] !== lastPartRef) {
                    if (parts[p].length < minLen) {
                        minLen = parts[p].length;
                        minPart = parts[p];
                    }
                }
            }
            if (minPart) {
                rule1K = minLen;
                var P = seq.slice(minPart.start, minPart.start + minPart.length);
                if (rule1K > 2) {
                    var m = P[0];
                    var n_diff = (x - 1) - m;
                    for (var j = 0; j < rule1K; j++) {
                        var val = x - 1;
                        var constraint1 = P[j] + n_diff;
                        if (j === rule1K - 1) {
                            val = Math.min(val, constraint1, P[j]);
                        } else {
                            val = Math.min(val, constraint1);
                        }
                        newSeq.push(val);
                    }
                } else {
                    for (var j = 0; j < rule1K; j++) newSeq.push(x - 1);
                }
            }
            currentL = rule1K + 1;
        } else {
            var stdVal;
            var foundB = false;
            if (y - 1 > x) {
                for (var kk = x; kk < y - 1; kk++) {
                    if (seq[kk] === b) { foundB = true; break; }
                }
            }
            stdVal = foundB ? b : x - 1;

            var triggerRule2 = false;
            var limitVal;
            if (stdVal >= 1 && stdVal <= seq.length) {
                limitVal = seq[stdVal - 1];
                var parts2 = [];
                var currentPart2 = { start: -1, length: 0 };
                for (var i2 = 0; i2 < seq.length; i2++) {
                    if (seq[i2] > limitVal) {
                        if (currentPart2.start === -1) currentPart2.start = i2;
                        currentPart2.length++;
                    } else {
                        if (currentPart2.length > 0) {
                            parts2.push({ start: currentPart2.start, length: currentPart2.length });
                            currentPart2 = { start: -1, length: 0 };
                        }
                    }
                }
                if (currentPart2.length > 0) parts2.push({ start: currentPart2.start, length: currentPart2.length });

                var rootPart = null;
                for (var p2 = 0; p2 < parts2.length; p2++) {
                    var part = parts2[p2];
                    if (badRootIndex >= part.start && badRootIndex < part.start + part.length) {
                        rootPart = part;
                        break;
                    }
                }
                var lastPart = null;
                for (var p3 = 0; p3 < parts2.length; p3++) {
                    var part = parts2[p3];
                    if ((y - 1) >= part.start && (y - 1) < part.start + part.length) {
                        lastPart = part;
                        break;
                    }
                }
                if (rootPart && lastPart && rootPart !== lastPart) {
                    var maxLen = 0;
                    for (var p4 = 0; p4 < parts2.length; p4++) {
                        if (parts2[p4] !== lastPart) {
                            if (parts2[p4].length > maxLen) maxLen = parts2[p4].length;
                        }
                    }
                    if (rootPart.length === maxLen && maxLen >= 2 &&
                        lastPart.length >= rootPart.length) {
                        triggerRule2 = true;
                    }
                }
            }
            if (triggerRule2) {
                newSeq.push(limitVal);
            } else {
                newSeq.push(stdVal);
            }
        }

        var targetLength = y + (n * currentL) - 1;
        var recursionStartLength = newSeq.length;
        var stickyIndex = newSeq.length - 1;
        while (newSeq.length < targetLength) {
            var idx = newSeq.length;
            var srcIdx = idx - currentL;
            if (srcIdx < 0) { newSeq.push(0); continue; }
            var val;
            if (isRule1) {
                if (rule1K > 2 && (idx - stickyIndex) % currentL === 0) {
                    val = newSeq[srcIdx];
                } else {
                    val = (newSeq[srcIdx] !== b) ? (newSeq[srcIdx] + currentL) : newSeq[srcIdx];
                }
            } else {
                val = (newSeq[srcIdx] >= x) ? (newSeq[srcIdx] + currentL) : newSeq[srcIdx];
                if (idx < recursionStartLength + currentL - 1) {
                    if (shouldResetRecursionVal(val, seq)) {
                        val = 0;
                    }
                }
            }
            newSeq.push(val);
        }
        return newSeq;
    }

    // -------- (UNOFFICIAL) PPS4.1 --------
    function fs_pps41(seq, n) {
        if (!seq || seq.length === 0) return [];
        if (seq[seq.length - 1] === 0) return seq.slice(0, -1);
        if (seq === Infinity || (Array.isArray(seq) && seq.length === 1 && seq[0] === Infinity)) {
            var res = [];
            for (var i = 0; i <= n; i++) res.push(i);
            return res;
        }

        var y = seq.length;
        var x = seq[y - 1];
        var badRootIndex = x - 1;
        var badRootVal = seq[badRootIndex];
        var badPart = seq.slice(badRootIndex, y - 1);
        var L = y - badRootIndex;

        // 白根存在：是否有相邻相等的数
        var whiteRootExists = false;
        for (var i = 0; i < y - 1; i++) {
            if (seq[i] === seq[i + 1]) {
                whiteRootExists = true;
                break;
            }
        }

        var goodPart = seq.slice(0, -1);
        var result = goodPart.slice();
        for (var k = 1; k <= n; k++) {
            if (whiteRootExists) {
                result.push(badRootVal);
            } else {
                result.push(x - 1);
            }
            var processedBad = badPart.map(function(val) {
                if (val < x) return val;
                else return val + L * k;
            });
            result = result.concat(processedBad);
        }
        return result;
    }

    // -------- PPS4 --------
    function fs_pps4(seq, n) {
        if (!seq || seq.length === 0) return [];
        if (seq[seq.length - 1] === 0) return seq.slice(0, -1);
        if (seq === Infinity || (Array.isArray(seq) && seq.length === 1 && seq[0] === Infinity)) {
            var res = [];
            for (var i = 0; i <= n; i++) res.push(i);
            return res;
        }

        var y = seq.length;
        var x = seq[y - 1];
        var badRootIndex = x - 1;
        var badRootVal = seq[badRootIndex];
        var badPart = seq.slice(badRootIndex, y - 1);
        var L = y - badRootIndex;

        // 白根存在：末项 > 3
        var whiteRootExists = (x > 3);

        var goodPart = seq.slice(0, -1);
        var result = goodPart.slice();
        for (var k = 1; k <= n; k++) {
            if (whiteRootExists) {
                result.push(badRootVal);
            } else {
                result.push(x - 1);
            }
            var processedBad = badPart.map(function(val) {
                if (val < x) return val;
                else return val + L * k;
            });
            result = result.concat(processedBad);
        }
        return result;
    }

    // -------- (UNOFFICIAL) PRRS --------
    function fs_prrs(seq, n) {
        if (!seq || seq.length === 0) return [];
        if (seq[seq.length - 1] <= 0) return seq.slice(0, -1);
        if (seq === Infinity || (Array.isArray(seq) && seq.length === 1 && seq[0] === Infinity)) {
            var res = [];
            for (var i = 0; i <= n; i++) res.push(i);
            return res;
        }

        var y = seq.length;
        var x = seq[y - 1];
        var b = seq[x - 1];
        var L = y - x;
        var a = seq.lastIndexOf(0) + 1;
        var leftZero = (y > 1 && seq[y - 2] === 0);
        var res = seq.slice(0, -1);

        var offset = (!leftZero && x > 1) ? L + 1 : L;
        var limit = y + n * offset - 1;

        for (var j = y; j <= limit; j++) {
            var i = j - offset;
            var vi = res[i - 1];
            if (vi === 0) { res.push(0); continue; }
            if (leftZero) {
                res.push(vi >= x ? vi + L : vi);
            } else if (x === 1) {
                res.push(j < y + L ? (vi <= x ? vi + a : vi + L) : vi + L);
            } else {
                res.push((j < y + L && vi < x) ? vi + (a + 1 - b) : vi + offset);
            }
        }
        return res;
    }

    // -------- (UNOFFICIAL) PRRS1.2 --------
    function fs_prrs12(seq, n) {
        if (!seq || seq.length === 0) return [];
        if (seq[seq.length - 1] <= 0) return seq.slice(0, -1);
        if (seq === Infinity || (Array.isArray(seq) && seq.length === 1 && seq[0] === Infinity)) {
            var res = [];
            for (var i = 0; i <= n; i++) res.push(i);
            return res;
        }

        var y = seq.length;
        var x = seq[y - 1];
        var b = seq[x - 1];
        var L = y - x;
        var a = seq.lastIndexOf(0) + 1;
        var leftZero = (y > 1 && seq[y - 2] === 0);
        var xVal = seq[x - 1];
        var xPrevVal = (x > 1) ? seq[x - 2] : null;
        var isSub1 = (x === 1) || (xVal === 0 && xPrevVal === 0);

        var res = seq.slice(0, -1);
        var offset = (!leftZero && !isSub1) ? L + 1 : L;
        var limit = y + n * offset - 1;

        for (var j = y; j <= limit; j++) {
            var i = j - offset;
            var vi = res[i - 1];
            if (vi === 0) { res.push(0); continue; }
            if (leftZero) {
                res.push(vi >= x ? vi + L : vi);
            } else if (isSub1) {
                if (j < y + L) {
                    res.push(vi <= x ? vi + (a + 1 - x) : vi + L);
                } else {
                    res.push(vi + L);
                }
            } else {
                if (j < y + L) {
                    res.push(vi < x ? vi + (a + 1 - b) : vi + offset);
                } else {
                    res.push(vi + offset);
                }
            }
        }
        return res;
    }

    // ---------- 注册所有表示法 ----------

    function createEntry(id, name, fsFunc) {
        return {
            id: id,
            name: name,
            display: sequence_display,
            able: able_default,
            compare: sequence_compare,
            FS: (function(f) {
                var cache = {};
                return function(seq, n) {
                    if (n < 0) n = 0;
                    var key = JSON.stringify(seq) + '@' + n;
                    if (cache[key]) return cache[key];
                    var result = f(seq, n);
                    cache[key] = result;
                    return result;
                };
            })(fsFunc),
            init: init_general
        };
    }

    // 注册
    register.push(createEntry('pps3.4', '(UNOFFICIAL) PPS3.4', fs_pps34));
    register.push(createEntry('pps3.5', '(UNOFFICIAL) PPS3.5', fs_pps35));
    register.push(createEntry('pps3.5beta', '(UNOFFICIAL) PPS3.5β', fs_pps35beta));
    register.push(createEntry('pps3.6', '(UNOFFICIAL) PPS3.6', fs_pps36));
    register.push(createEntry('pps4.1', '(UNOFFICIAL) PPS4.1', fs_pps41));
    register.push(createEntry('pps4', 'PPS4', fs_pps4));          // 无前缀
    register.push(createEntry('prrs', '(UNOFFICIAL) PRRS', fs_prrs));
    register.push(createEntry('prrs1.2', '(UNOFFICIAL) PRRS1.2', fs_prrs12));

    console.log('[pps-prrs] PPS/PRRS 系列表示法已注册（精确实现）。');
})(window.register || (window.register = []));