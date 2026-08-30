// nLTrSS.js - nLTrSS Notation for NE-CCN
// Based on the original nLTrSS expander.py

(function() {
    // 注册到全局 register 数组
    if (typeof register === 'undefined') {
        console.error('nLTrSS: register not found. Make sure this script is loaded after framework.js');
        return;
    }

    // ==================== 格式转换层 ====================

    // 逗号格式转交叉格式
    function commaToCross(expr) {
        expr = expr.trim();
        if (!expr) return "";
        let result = [];
        let count = 0;
        let start = 0;
        for (let i = 0; i < expr.length; i++) {
            const char = expr[i];
            if (char === '(') count++;
            else if (char === ')') {
                count--;
                if (count === 0) {
                    let arr = expr.substring(start, i + 1);
                    let inner = arr.substring(1, arr.length - 1);
                    let convertedInner = inner.replace(/,+/g, function(match) {
                        return '(' + match.length + ')';
                    });
                    result.push('(' + convertedInner + ')');
                    start = i + 1;
                }
            }
        }
        return result.join('');
    }

    // 交叉格式转逗号格式
    function crossToComma(expr) {
        expr = expr.trim();
        if (!expr) return "";
        let result = [];
        let count = 0;
        let start = 0;
        for (let i = 0; i < expr.length; i++) {
            const char = expr[i];
            if (char === '(') count++;
            else if (char === ')') {
                count--;
                if (count === 0) {
                    let arr = expr.substring(start, i + 1);
                    let inner = arr.substring(1, arr.length - 1);
                    let convertedInner = inner.replace(/\((\d+)\)/g, function(match, num) {
                        return ','.repeat(parseInt(num));
                    });
                    result.push('(' + convertedInner + ')');
                    start = i + 1;
                }
            }
        }
        return result.join('');
    }

    // ==================== 基础工具层 ====================

    function splitExpression(expr) {
        expr = expr.replace(/ /g, "").trim();
        let arrays = [];
        let count = 0;
        let start = 0;
        for (let i = 0; i < expr.length; i++) {
            const char = expr[i];
            if (char === '(') count++;
            else if (char === ')') {
                count--;
                if (count === 0) {
                    arrays.push(expr.substring(start, i + 1));
                    start = i + 1;
                }
            }
        }
        return arrays;
    }

    function parseToItems(arrStr) {
        let inner = arrStr.substring(1, arrStr.length - 1);
        if (!inner) return [];
        let items = [];
        let match;
        const regex = /\d+|\(\d+\)/g;
        while ((match = regex.exec(inner)) !== null) {
            items.push(match[0]);
        }
        return items;
    }

    function formatArr(items) {
        return "(" + items.join("") + ")";
    }

    function cmpArrays(arr1, arr2) {
        let list1 = parseToItems(arr1).map(x => parseInt(x.replace(/[()]/g, '')));
        let list2 = parseToItems(arr2).map(x => parseInt(x.replace(/[()]/g, '')));
        let minLen = Math.min(list1.length, list2.length);
        for (let k = 0; k < minLen; k++) {
            if (list1[k] !== list2[k]) {
                return list1[k] > list2[k] ? 1 : -1;
            }
        }
        if (list1.length > list2.length) return 1;
        if (list1.length < list2.length) return -1;
        return 0;
    }

    function isPrefixOf(pkStr, arrStr) {
        let pkItems = parseToItems(pkStr);
        let arrItems = parseToItems(arrStr);
        if (pkStr === "()") pkItems = [];
        if (pkItems.length > arrItems.length) return false;
        for (let i = 0; i < pkItems.length; i++) {
            if (pkItems[i] !== arrItems[i]) return false;
        }
        return true;
    }

    function isPredecessor(pred, arr) {
        let predItems = parseToItems(pred);
        let arrItems = parseToItems(arr);
        if (predItems.length === 0) return arrItems.length === 0;
        if (predItems.length >= arrItems.length) return false;
        if (!arrItems[predItems.length].startsWith('(')) return false;
        for (let i = 0; i < predItems.length; i++) {
            if (predItems[i] !== arrItems[i]) return false;
        }
        return true;
    }

    function getAllPredecessors(arr) {
        let items = parseToItems(arr);
        let preds = new Set();
        for (let i = items.length - 1; i > 0; i--) {
            if (items[i].startsWith('(')) {
                preds.add(formatArr(items.slice(0, i)));
            }
        }
        return preds;
    }

    function getComplementPredecessor(arr, pred) {
        let predItems = parseToItems(pred);
        let arrItems = parseToItems(arr);
        let remItems = arrItems.slice(predItems.length + 1);
        return formatArr(remItems);
    }

    function getComplementPrefix(arr, prefix) {
        let prefixItems = parseToItems(prefix);
        let arrItems = parseToItems(arr);
        if (prefix === "()") prefixItems = [];
        return formatArr(arrItems.slice(prefixItems.length));
    }

    function getLastTerm(arrStr) {
        let items = parseToItems(arrStr);
        if (items.length === 0) return 0;
        let lastItem = items[items.length - 1];
        return lastItem.startsWith('(') ? 0 : parseInt(lastItem);
    }

    function getExtractionTreeData(expr) {
        let arrays = splitExpression(expr);
        if (arrays.length === 0) return { treeList: [], treeIndices: {} };
        let treeDict = {};
        let current = arrays[arrays.length - 1];
        let currentIdx = arrays.length - 1;
        treeDict[current] = currentIdx;
        while (current !== "(1)") {
            let found = null;
            let foundIdx = -1;
            for (let i = currentIdx - 1; i >= 0; i--) {
                if (cmpArrays(arrays[i], current) < 0) {
                    found = arrays[i];
                    foundIdx = i;
                    break;
                }
            }
            if (!found) break;
            current = found;
            currentIdx = foundIdx;
            treeDict[current] = currentIdx;
        }
        let treeList = Object.keys(treeDict).sort((a, b) => cmpArrays(a, b));
        return { treeList, treeIndices: treeDict };
    }

    // ==================== 核心业务层 ====================

    function findClass1Fathers(exprArrs, treeList, treeIndices, A) {
        let P = [];
        let items = parseToItems(A);
        let temp = items.slice();
        while (temp.length > 0) {
            if (temp.length >= 2 && temp[temp.length - 1].startsWith('(')) {
                temp.pop();
                temp.pop();
            } else {
                temp.pop();
            }
            if (temp.length > 0) P.push(formatArr(temp));
        }
        P.push("()");

        let p = P.length;
        let k = 1, m = 2;
        let result = {};
        while (k < p) {
            let pk = P[k - 1];
            if (m > treeList.length) {
                k++;
                m = 2;
                continue;
            }
            let T_neg_m = treeList[treeList.length - m];
            if (!isPrefixOf(pk, T_neg_m)) {
                k++;
                m = 2;
                continue;
            }
            let segment = exprArrs.slice(treeIndices[T_neg_m]);
            let isCommon = segment.every(arr => isPrefixOf(pk, arr));
            if (!isCommon) {
                k++;
                m = 2;
                continue;
            }
            if (!result[T_neg_m]) result[T_neg_m] = [];
            result[T_neg_m].push(pk);
            m++;
        }
        return result;
    }

    function findClass2Fathers(exprArrs, treeList, treeIndices, A) {
        let class2Fathers = [];
        let m = 2;
        while (m <= treeList.length) {
            let T_m = treeList[treeList.length - m];
            if (!isPredecessor(T_m, A)) {
                if (T_m === "(1)") break;
                m++;
                continue;
            }
            class2Fathers.push(T_m);
            if (T_m === "(1)") break;
            let A_2_x = getComplementPredecessor(A, T_m);
            let rightBoundIdx = treeIndices[T_m];
            while (true) {
                let predSet = getAllPredecessors(A_2_x);
                if (predSet.size === 0) break;
                let foundIdx = -1, foundArr = null;
                for (let i = rightBoundIdx - 1; i >= 0; i--) {
                    if (predSet.has(exprArrs[i])) {
                        foundIdx = i;
                        foundArr = exprArrs[i];
                        break;
                    }
                }
                if (foundIdx === -1) break;
                class2Fathers.push(foundArr);
                A_2_x = getComplementPredecessor(A_2_x, foundArr);
                rightBoundIdx = foundIdx;
            }
            break;
        }
        return class2Fathers;
    }

    function findRealFatherWithMeta(exprArrs, treeList, treeIndices, A) {
        let a = getLastTerm(A);
        let class1Result = findClass1Fathers(exprArrs, treeList, treeIndices, A);
        let class2List = findClass2Fathers(exprArrs, treeList, treeIndices, A);

        if (a !== 1) {
            let target = null;
            for (let i = treeList.length - 2; i >= 0; i--) {
                if (getLastTerm(treeList[i]) === a - 1) {
                    target = treeList[i];
                    break;
                }
            }
            if (!target) return { badRoot: null, isClass1: false, class1Key: null, eqExpr: "", eqBadRoot: null };
            if (class1Result[target]) {
                let maxKey = class1Result[target].sort((x, y) => cmpArrays(x, y))[class1Result[target].length - 1];
                return { badRoot: target, isClass1: true, class1Key: maxKey, eqExpr: "", eqBadRoot: null };
            } else {
                return { badRoot: target, isClass1: false, class1Key: null, eqExpr: "", eqBadRoot: null };
            }
        }

        let items = parseToItems(A);
        let lastSepIs1 = items.length >= 2 && items[items.length - 2] === "(1)";

        if (lastSepIs1) {
            let class1List = Object.keys(class1Result).sort((a, b) => cmpArrays(a, b));
            if (class1List.length > 0) {
                let lastClass1 = class1List[class1List.length - 1];
                let lastKey = class1Result[lastClass1].sort((x, y) => cmpArrays(x, y))[class1Result[lastClass1].length - 1];
                let hasSameKeyBefore = class1List.slice(0, -1).some(c1 => {
                    let key = class1Result[c1].sort((x, y) => cmpArrays(x, y))[class1Result[c1].length - 1];
                    return key === lastKey;
                });
                if (hasSameKeyBefore) {
                    // 找最靠前的符合条件的I类
                    let firstClass1 = null;
                    for (let c1 of class1List) {
                        let c1Key = class1Result[c1].sort((x, y) => cmpArrays(x, y))[class1Result[c1].length - 1];
                        if (c1Key === lastKey) {
                            firstClass1 = c1;
                            break;
                        }
                    }

                    if (firstClass1) {
                        let firstIdx = exprArrs.indexOf(firstClass1);
                        let eqInterval = exprArrs.slice(firstIdx);
                        let keyItems = parseToItems(lastKey);
                        let eqExprArrs = [];
                        for (let arr of eqInterval) {
                            let arrItems = parseToItems(arr);
                            let compItems = arrItems.slice(keyItems.length);
                            eqExprArrs.push(formatArr(compItems));
                        }
                        let eqExpr = eqExprArrs.join('');

                        let eqData = getExtractionTreeData(eqExpr);
                        let eqExprArrs2 = splitExpression(eqExpr);
                        let eqA = eqExprArrs2[eqExprArrs2.length - 1];
                        let eqClass2 = findClass2Fathers(eqExprArrs2, eqData.treeList, eqData.treeIndices, eqA);

                        if (eqClass2.length > 0) {
                            let eqBadRoot = eqClass2[eqClass2.length - 1];
                            let eqBadRootIdxInEq = eqExprArrs2.indexOf(eqBadRoot);
                            let realBadRoot = eqInterval[eqBadRootIdxInEq];
                            return { badRoot: realBadRoot, isClass1: true, class1Key: lastKey, eqExpr: eqExpr, eqBadRoot: eqBadRoot };
                        }
                    }
                }
            }

            if (class2List.length > 0) {
                return { badRoot: class2List[class2List.length - 1], isClass1: false, class1Key: null, eqExpr: "", eqBadRoot: null };
            }
            return { badRoot: null, isClass1: false, class1Key: null, eqExpr: "", eqBadRoot: null };
        } else {
            let class1List = Object.keys(class1Result).sort((a, b) => cmpArrays(a, b));
            if (class1List.length > 0) {
                let lastClass1 = class1List[class1List.length - 1];
                let lastKey = class1Result[lastClass1].sort((x, y) => cmpArrays(x, y))[class1Result[lastClass1].length - 1];
                let hasSameKeyBefore = class1List.slice(0, -1).some(c1 => {
                    let key = class1Result[c1].sort((x, y) => cmpArrays(x, y))[class1Result[c1].length - 1];
                    return key === lastKey;
                });
                if (hasSameKeyBefore) {
                    return { badRoot: lastClass1, isClass1: true, class1Key: lastKey, eqExpr: "", eqBadRoot: null };
                }
            }

            if (class2List.length > 0) {
                return { badRoot: class2List[class2List.length - 1], isClass1: false, class1Key: null, eqExpr: "", eqBadRoot: null };
            }
            return { badRoot: null, isClass1: false, class1Key: null, eqExpr: "", eqBadRoot: null };
        }
    }

    // ==================== 最终展开引擎 ====================

    function processExpression(expr, n) {
        expr = commaToCross(expr);

        if (!expr) return "0";

        let exprArrs = splitExpression(expr);
        let A = exprArrs[exprArrs.length - 1];

        if (A === "(1)") {
            return crossToComma(exprArrs.slice(0, -1).join(''));
        }

        if (n === 0) {
            return crossToComma(exprArrs.slice(0, -1).join(''));
        }

        let treeData = getExtractionTreeData(expr);
        let treeList = treeData.treeList;
        let treeIndices = treeData.treeIndices;

        let result = findRealFatherWithMeta(exprArrs, treeList, treeIndices, A);
        let badRoot = result.badRoot;
        let isClass1 = result.isClass1;
        let class1Key = result.class1Key;
        let eqExpr = result.eqExpr;
        let eqBadRoot = result.eqBadRoot;

        if (!badRoot) return crossToComma(expr);

        let badRootIdx = -1;
        for (let i = exprArrs.length - 2; i >= 0; i--) {
            if (exprArrs[i] === badRoot) {
                badRootIdx = i;
                break;
            }
        }
        if (badRootIdx === -1) return crossToComma(expr);

        let G = exprArrs.slice(0, badRootIdx).join('');
        let B = exprArrs.slice(badRootIdx, -1).join('');
        let BArrs = exprArrs.slice(badRootIdx, -1);

        let items = parseToItems(A);
        let lastTerm = getLastTerm(A);
        let lastSep = (items.length >= 2 && items[items.length - 1] === "1") ? parseInt(items[items.length - 2].replace(/[()]/g, '')) : null;

        let stretch, mode;

        if (lastTerm === 1 && lastSep === 1) {
            if (isClass1) {
                let eqExprArrs = splitExpression(eqExpr);
                let eqA = eqExprArrs[eqExprArrs.length - 1];
                let eqItems = parseToItems(eqA);
                let eqA_dashItems = eqItems.slice(0, -2);
                let eqA_dash = formatArr(eqA_dashItems);

                let tempItems = eqA_dashItems.slice();
                let L_minus = null;
                while (true) {
                    let pk = tempItems.length > 0 ? formatArr(tempItems) : "()";
                    if (getComplementPrefix(eqA_dash, pk) === eqBadRoot) {
                        L_minus = pk;
                        break;
                    }
                    if (tempItems.length === 0) break;
                    if (tempItems.length >= 2 && tempItems[tempItems.length - 1].startsWith('(')) {
                        tempItems.pop();
                        tempItems.pop();
                    } else {
                        tempItems.pop();
                    }
                }
                stretch = L_minus;
                mode = 'key';
            } else {
                let newItems = items.slice(0, -2);
                let A_dash = formatArr(newItems);
                let tempItems = newItems.slice();
                let L_minus = null;
                while (true) {
                    let pk = tempItems.length > 0 ? formatArr(tempItems) : "()";
                    if (getComplementPrefix(A_dash, pk) === badRoot) {
                        L_minus = pk;
                        break;
                    }
                    if (tempItems.length === 0) break;
                    if (tempItems.length >= 2 && tempItems[tempItems.length - 1].startsWith('(')) {
                        tempItems.pop();
                        tempItems.pop();
                    } else {
                        tempItems.pop();
                    }
                }
                stretch = L_minus;
                mode = 'front';
            }
        } else if (lastTerm === 1 && lastSep !== 1) {
            let newItems = items.slice(0, -2);
            newItems.push('(' + (lastSep - 1) + ')');
            let A_dash = formatArr(newItems);
            let L_minus = A_dash;

            if (isClass1) {
                stretch = getComplementPrefix(A_dash, class1Key);
                mode = 'key';
            } else {
                stretch = L_minus;
                mode = 'front';
            }
        } else {
            let newItems = items.slice(0, -1);
            newItems.push(String(lastTerm - 1));
            newItems.push('(' + (lastTerm - 1) + ')');
            let A_dash = formatArr(newItems);
            let L_minus = A_dash;

            if (isClass1) {
                stretch = getComplementPrefix(A_dash, class1Key);
                mode = 'key';
            } else {
                stretch = L_minus;
                mode = 'front';
            }
        }

        function applyStretch(k) {
            let res = [];
            for (let arr of BArrs) {
                if (mode === 'front') {
                    let stretchInner = stretch.substring(1, stretch.length - 1);
                    let arrInner = arr.substring(1, arr.length - 1);
                    res.push("(" + stretchInner.repeat(k) + arrInner + ")");
                } else {
                    let pkItems = parseToItems(class1Key);
                    let arrItems = parseToItems(arr);
                    let prefix = arrItems.slice(0, pkItems.length).join('');
                    let suffix = arrItems.slice(pkItems.length).join('');
                    let stretchInner = stretch.substring(1, stretch.length - 1);
                    res.push("(" + prefix + stretchInner.repeat(k) + suffix + ")");
                }
            }
            return res.join('');
        }

        if (n === 1) {
            let stretchedBadRoot;
            if (mode === 'front') {
                let stretchInner = stretch.substring(1, stretch.length - 1);
                let brInner = badRoot.substring(1, badRoot.length - 1);
                stretchedBadRoot = "(" + stretchInner + brInner + ")";
            } else {
                let pkItems = parseToItems(class1Key);
                let brItems = parseToItems(badRoot);
                let prefix = brItems.slice(0, pkItems.length).join('');
                let suffix = brItems.slice(pkItems.length).join('');
                let stretchInner = stretch.substring(1, stretch.length - 1);
                stretchedBadRoot = "(" + prefix + stretchInner + suffix + ")";
            }
            return crossToComma(exprArrs.slice(0, -1).join('') + stretchedBadRoot);
        } else {
            let terms = [G, B];
            for (let i = 1; i < n; i++) {
                terms.push(applyStretch(i));
            }
            return crossToComma(terms.join(''));
        }
    }

    // ==================== 判断是否为limit ====================

    function isLimit(expr) {
        if (typeof expr !== 'string') return false;
        if (!expr || expr.trim() === '') return false;

        try {
            let exprArrs = splitExpression(expr);
            if (exprArrs.length === 0) return false;
            let A = exprArrs[exprArrs.length - 1];
            // 如果最后一项是 (1)，不是limit（后继）
            if (A === "(1)") return false;
            return true;
        } catch (e) {
            return false;
        }
    }

    // ==================== 比较函数 ====================

    function compareExpr(a, b) {
        if (a === b) return 0;
        if (a === 'Infinity' || a === Infinity) return 1;
        if (b === 'Infinity' || b === Infinity) return -1;

        try {
            let aArrs = splitExpression(a);
            let bArrs = splitExpression(b);

            let minLen = Math.min(aArrs.length, bArrs.length);
            for (let i = 0; i < minLen; i++) {
                let cmp = cmpArrays(aArrs[i], bArrs[i]);
                if (cmp !== 0) return cmp;
            }
            if (aArrs.length < bArrs.length) return -1;
            if (aArrs.length > bArrs.length) return 1;
            return 0;
        } catch (e) {
            if (a < b) return -1;
            if (a > b) return 1;
            return 0;
        }
    }

    // ==================== nLTrSS 注册 ====================

    register.push({
        id: 'nltrss',
        name: 'nLTrSS',

        // display: 将表达式转换为HTML显示
        display: function(expr) {
            if (expr === null || expr === undefined) {
                return '';
            }
            if (expr === 'Infinity' || expr === Infinity) {
                return '∞';
            }
            if (typeof expr !== 'string') {
                return String(expr);
            }
            if (expr === '' || expr === '0') {
                return '0';
            }

            try {
                // 尝试转换为交叉格式显示
                let cross = commaToCross(expr);
                if (cross) return cross;
                return expr;
            } catch (e) {
                return expr;
            }
        },

        // able: 判断是否为limit ordinal
        able: function(expr) {
            if (typeof expr !== 'string') return false;
            if (!expr || expr.trim() === '') return false;
            try {
                return isLimit(expr);
            } catch (e) {
                return false;
            }
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

            if (typeof a !== 'string' || typeof b !== 'string') {
                if (a === b) return 0;
                return String(a) < String(b) ? -1 : 1;
            }

            try {
                // 尝试转换为交叉格式进行比较
                let aCross = commaToCross(a);
                let bCross = commaToCross(b);
                if (!aCross) aCross = a;
                if (!bCross) bCross = b;
                return compareExpr(aCross, bCross);
            } catch (e) {
                if (a === b) return 0;
                return a < b ? -1 : 1;
            }
        },

        // FS: 基本序列展开
        FS: function(expr, n) {
            if (typeof expr !== 'string') return expr;
            if (!expr || expr.trim() === '') return expr;
            if (!this.able(expr)) return expr;

            let times = Math.max(0, Math.floor(n));
            try {
                let result = processExpression(expr, times);
                return result;
            } catch (e) {
                console.warn('nLTrSS expansion failed:', e);
                return expr;
            }
        },

        // FSalter: 替代展开方式（Shift+点击）
        FSalter: function(expr, n) {
            return this.FS(expr, n);
        },

        // init: 初始化根节点
        init: function() {
            return [
                {
                    expr: Infinity,
                    low: ["(0)"],
                    subitems: []
                },
                {
                    expr: "0",
                    low: ["(0)"],
                    subitems: []
                },
                {
                    expr: "(0)",
                    low: ["0"],
                    subitems: []
                },
                {
                    expr: "(1)",
                    low: ["(0)"],
                    subitems: []
                }
            ];
        },

        // semiable: 判断是否为半极限
        semiable: function(expr) {
            return false;
        }
    });

    console.log('nLTrSS notation registered successfully!');

})();