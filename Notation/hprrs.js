// hprrs.js - HPRRS 表示法注册器
// 标识符: hprrs, 名称: HPRRS

(function(register) {
    'use strict';

    // ---------- 核心展开算法（精确翻译自 HTML） ----------

    function expandHPRRS(seq, n) {
        if (!seq || seq.length === 0) return [];
        if (seq[0] === Infinity && seq.length === 1) {
            var res = [];
            for (var i = 0; i <= n; i++) res.push(i);
            return res;
        }

        var seqOriginal = seq.slice();
        var z = seq.length;
        var firstVal = seq[0];
        var y = seq[z - 1];

        // 如果末项 <= 首项，返回原序列（无展开）
        if (y <= firstVal) {
            return seq.slice();
        }

        var leftOfLast = seq[z - 2];
        var badRootIdx = y; // 坏根索引（1-based）

        if (badRootIdx < 1 || badRootIdx > z - 1) {
            return seq.slice(0, -1);
        }

        var x = seq[badRootIdx - 1];
        var badPart = seq.slice(badRootIdx - 1, z - 1);
        var L = badPart.length;

        var isWeakExpansion = (leftOfLast === 0);

        var zeroIdx0Based = -1;
        var pStart1Based = -1;
        var k_weak = -1;

        // 弱展开：找坏根左侧最近的 0
        if (isWeakExpansion) {
            for (var i = badRootIdx - 2; i >= 0; i--) {
                if (seq[i] === 0) {
                    k_weak = i + 1;
                    break;
                }
            }
        } else {
            // 强展开：找末项左侧最近的 0
            for (var i = z - 2; i >= 0; i--) {
                if (seq[i] === 0) {
                    zeroIdx0Based = i;
                    break;
                }
            }
            if (zeroIdx0Based === -1) {
                return seq.slice(0, -1);
            }
            pStart1Based = zeroIdx0Based + 2;
        }

        // 删除末项
        var result = seq.slice(0, -1);

        if (isWeakExpansion) {
            // -------- 弱展开 --------
            for (var iter = 1; iter <= n; iter++) {
                for (var idx = 0; idx < badPart.length; idx++) {
                    var v = badPart[idx];
                    var currIdx1Based = badRootIdx + idx;
                    var leftVOriginal = (currIdx1Based >= 2) ? seqOriginal[currIdx1Based - 2] : 0;

                    // 判断是否为强展开项 (SEI)：值非0且左侧相邻项非0
                    var isSEI = (v !== 0 && leftVOriginal !== 0);

                    if (v <= x) {
                        result.push(v);
                    } else if (v === k_weak) {
                        result.push(v);
                    } else if (isSEI && v < y) {
                        // V7 新规则：弱展开时，被复制的强展开项(SEI)如果小于末项的值(y)，也原封不动复制
                        result.push(v);
                    } else {
                        result.push(v + iter * L);
                    }
                }
            }
        } else {
            // -------- 强展开 --------
            var ptr = pStart1Based;

            var getNextTargetIndex = function() {
                while (ptr <= result.length) {
                    if (result[ptr - 1] !== 0) {
                        var target = ptr;
                        ptr++;
                        return target;
                    }
                    ptr++;
                }
                return ptr;
            };

            var isStrongExpansionItemAt = function(arr, idx1Based) {
                var v = arr[idx1Based - 1];
                var leftV = (idx1Based >= 2) ? arr[idx1Based - 2] : 0;
                return v !== 0 && leftV !== 0;
            };

            var findNearestWeakPositionLeft = function(arr, startIdx1Based) {
                for (var j = startIdx1Based; j >= 1; j--) {
                    var v = arr[j - 1];
                    var leftV = (j >= 2) ? arr[j - 2] : 0;
                    if (v !== 0 && leftV === 0) return j;
                }
                return startIdx1Based;
            };

            for (var k = 1; k <= n; k++) {
                var currentIterWeiCache = {};

                for (var i = 0; i < badPart.length; i++) {
                    var v = badPart[i];
                    var currIdx1Based = badRootIdx + i;
                    var leftVOriginal = (currIdx1Based >= 2) ? seqOriginal[currIdx1Based - 2] : 0;

                    var isSEI = (v !== 0 && leftVOriginal !== 0);
                    var isWEI = (v !== 0 && leftVOriginal === 0);

                    if (v <= x) {
                        result.push(v);
                        continue;
                    }

                    var isNotInBetween = (currIdx1Based <= zeroIdx0Based + 1);

                    if (isSEI && isNotInBetween) {
                        getNextTargetIndex();
                        result.push(v + k * L);
                        continue;
                    }

                    var targetIdx = getNextTargetIndex();

                    if (isWEI) {
                        if (currentIterWeiCache.hasOwnProperty(v)) {
                            targetIdx = currentIterWeiCache[v];
                        } else {
                            if (isStrongExpansionItemAt(result, targetIdx)) {
                                targetIdx = findNearestWeakPositionLeft(result, targetIdx);
                            }
                            currentIterWeiCache[v] = targetIdx;
                        }
                    }

                    result.push(targetIdx);
                }
            }
        }

        return result;
    }

    // ---------- 表示法公共函数 ----------

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

    function able(expr) {
        if (!expr || expr.length === 0) return false;
        if (expr === Infinity || (Array.isArray(expr) && expr.length === 1 && expr[0] === Infinity)) {
            return true;
        }
        // 判断是否为极限：末项 > 首项
        var firstVal = expr[0];
        var lastVal = expr[expr.length - 1];
        return lastVal > firstVal;
    }

    function init_general() {
        return [
            { expr: [Infinity], low: [[0]], subitems: [] },
            { expr: [0], low: [[0]], subitems: [] }
        ];
    }

    // ---------- 注册条目 ----------

    register.push({
        id: 'hprrs',
        name: '(UNOFFICIAL)HPRRS',

        display: sequence_display,

        able: able,

        compare: sequence_compare,

        FS: (function() {
            var cache = {};
            return function(seq, n) {
                if (n < 0) n = 0;
                if (seq && seq.length === 1 && seq[0] === Infinity) {
                    var res = [];
                    for (var i = 0; i <= n; i++) res.push(i);
                    return res;
                }
                if (!seq || seq.length === 0) return [];

                var key = JSON.stringify(seq) + '@' + n;
                if (cache[key]) return cache[key];

                var result = expandHPRRS(seq, n);
                cache[key] = result;
                return result;
            };
        })(),

        // FSalter 可选
        FSalter: (function() {
            var cache = {};
            return function(seq, n) {
                if (n < 0) n = 0;
                if (seq && seq.length === 1 && seq[0] === Infinity) {
                    var res = [];
                    for (var i = 0; i <= n + 1; i++) res.push(i);
                    return res;
                }
                if (!seq || seq.length === 0) return [];

                var key = JSON.stringify(seq) + '@' + n + '_full';
                if (cache[key]) return cache[key];

                var result = expandHPRRS(seq, n);
                cache[key] = result;
                return result;
            };
        })(),

        init: init_general,

        // 半极限判断
        semiable: function(expr) {
            if (!expr || expr.length === 0) return false;
            var firstVal = expr[0];
            var lastVal = expr[expr.length - 1];
            // 如果末项 <= 首项但末项为 0，则可能是后继而非极限
            if (lastVal <= firstVal) return false;
            // 检查坏根索引是否有效
            var badRootIdx = lastVal;
            if (badRootIdx < 1 || badRootIdx >= expr.length) return false;
            return true;
        }
    });

    console.log('[hprrs] HPRRS 表示法已注册。');
})(window.register || (window.register = []));