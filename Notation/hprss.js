// HPrSS (High-level Primitive Sequence System) 实现
// 基于山脉图结构的数列系统

const hprss = {
    id: 'hprss',
    name: 'HPrSS',
    
    // 将表达式转换为可读的HTML字符串
    display: function(expr) {
        if (!expr || expr.length === 0) return '0';
        if (expr === Infinity) return '∞';
        if (!Array.isArray(expr)) return String(expr);
        return 'HPrSS(' + expr.map(String).join(',') + ')';
    },
    
    // 判断是否为极限序数
    able: function(expr) {
        if (expr === Infinity) return true;
        if (!Array.isArray(expr) || expr.length === 0) return false;
        // 如果最后一个元素是1，则是后继序数
        if (expr[expr.length - 1] === 1) return false;
        return true;
    },
    
    // 比较两个表达式
    compare: function(a, b) {
        if (a === Infinity && b === Infinity) return 0;
        if (a === Infinity) return 1;
        if (b === Infinity) return -1;
        
        if (!Array.isArray(a) || a.length === 0) {
            if (!Array.isArray(b) || b.length === 0) return 0;
            return -1;
        }
        if (!Array.isArray(b) || b.length === 0) return 1;
        
        const minLen = Math.min(a.length, b.length);
        for (let i = 0; i < minLen; i++) {
            if (a[i] < b[i]) return -1;
            if (a[i] > b[i]) return 1;
        }
        
        if (a.length < b.length) return -1;
        if (a.length > b.length) return 1;
        return 0;
    },
    
    // 计算父项：在该元素左边且小于该元素的第一个项
    findParent: function(seq, index) {
        if (index <= 0) return -1;
        const value = seq[index];
        for (let i = index - 1; i >= 0; i--) {
            if (seq[i] < value) {
                return i;
            }
        }
        return -1;
    },
    
    // 计算阶差序列
    computeDiffSeq: function(seq) {
        if (!seq || seq.length === 0) return [];
        const diffSeq = [];
        for (let i = 0; i < seq.length; i++) {
            const parentIdx = this.findParent(seq, i);
            if (parentIdx < 0) {
                diffSeq.push(seq[i]); // 没有父项，阶差为其自身
            } else {
                diffSeq.push(seq[i] - seq[parentIdx]);
            }
        }
        return diffSeq;
    },
    
    // 在阶差序列中查找父项
    // 条件：第一个在左边、小于它，并且对应的原序列中的项是该元素正下方原序列中元素的祖先
    findDiffParent: function(seq, diffSeq, index) {
        if (index <= 0) return -1;
        const value = diffSeq[index];
        const originalIndex = index; // 阶差项index对应原序列中相同位置的元素
        
        // 从左边开始查找
        for (let i = index - 1; i >= 0; i--) {
            if (diffSeq[i] < value) {
                // 检查对应的原序列项是否是originalIndex的祖先
                if (this.isAncestor(seq, i, originalIndex)) {
                    return i;
                }
            }
        }
        return -1;
    },
    
    // 检查元素i是否是元素j的祖先
    isAncestor: function(seq, i, j) {
        if (i >= j) return false;
        let current = j;
        while (current > 0) {
            const parent = this.findParent(seq, current);
            if (parent === i) return true;
            if (parent < 0) return false;
            current = parent;
        }
        return false;
    },
    
    // 构建山脉图结构
    buildMountain: function(seq) {
        const diffSeq = this.computeDiffSeq(seq);
        const mountain = {
            seq: seq,
            diffSeq: diffSeq,
            // 存储每个节点的父项（在阶差序列中的索引）
            diffParents: [],
            // 存储每个节点的子项
            diffChildren: []
        };
        
        for (let i = 0; i < diffSeq.length; i++) {
            const parent = this.findDiffParent(seq, diffSeq, i);
            mountain.diffParents.push(parent);
            if (!mountain.diffChildren[parent]) {
                mountain.diffChildren[parent] = [];
            }
            if (parent >= 0) {
                mountain.diffChildren[parent].push(i);
            }
        }
        
        return mountain;
    },
    
    // 找到山脉图的根元素（阶差序列末项的父项）
    findRoot: function(mountain) {
        const lastIdx = mountain.diffSeq.length - 1;
        if (lastIdx < 0) return -1;
        return mountain.diffParents[lastIdx];
    },
    
    // 获取坏部（根元素右边的所有结构）
    getBadPart: function(mountain) {
        const root = this.findRoot(mountain);
        if (root < 0) return { indices: [], diffIndices: [] };
        
        const badIndices = [];
        const badDiffIndices = [];
        
        // 收集根元素右边的所有元素
        for (let i = root + 1; i < mountain.seq.length; i++) {
            badIndices.push(i);
            badDiffIndices.push(i);
        }
        
        // 收集这些元素的后代
        const visited = new Set(badDiffIndices);
        let queue = [...badDiffIndices];
        while (queue.length > 0) {
            const current = queue.shift();
            const children = mountain.diffChildren[current] || [];
            for (const child of children) {
                if (!visited.has(child)) {
                    visited.add(child);
                    badDiffIndices.push(child);
                    if (!badIndices.includes(child)) {
                        badIndices.push(child);
                    }
                    queue.push(child);
                }
            }
        }
        
        // 按索引排序
        badIndices.sort((a, b) => a - b);
        badDiffIndices.sort((a, b) => a - b);
        
        return { indices: badIndices, diffIndices: badDiffIndices };
    },
    
    // PrSS展开方式（当阶差序列末项为1时使用）
    prssExpand: function(seq) {
        if (seq.length <= 1) return [];
        const last = seq[seq.length - 1];
        if (last === 1) return seq.slice(0, -1);
        
        // PrSS标准展开：找坏根
        let badRoot = -1;
        for (let i = seq.length - 2; i >= 0; i--) {
            if (seq[i] < last) {
                badRoot = i;
                break;
            }
        }
        if (badRoot < 0) return seq.slice(0, -1);
        
        // 复制坏部
        const result = seq.slice(0, badRoot + 1);
        const badPart = seq.slice(badRoot + 1, seq.length);
        const delta = last - seq[badRoot] - 1;
        
        for (let i = 0; i < 2; i++) { // 复制一次
            for (const val of badPart) {
                result.push(val + delta * (i + 1));
            }
        }
        
        return result;
    },
    
    // 计算展开后的序列
    expandMountain: function(seq, copyCount) {
        const mountain = this.buildMountain(seq);
        const root = this.findRoot(mountain);
        if (root < 0) return seq.slice(0, -1);
        
        const badPart = this.getBadPart(mountain);
        if (badPart.indices.length === 0) return seq.slice(0, -1);
        
        // 好部（根元素及其左边）
        const goodPart = seq.slice(0, root + 1);
        const goodDiff = mountain.diffSeq.slice(0, root + 1);
        
        // 计算坏部的增量
        const lastDiff = mountain.diffSeq[mountain.diffSeq.length - 1];
        const rootDiff = mountain.diffSeq[root];
        const delta = lastDiff - rootDiff - 1;
        
        // 复制坏部
        let resultSeq = [...goodPart];
        let resultDiff = [...goodDiff];
        
        for (let copy = 0; copy < copyCount; copy++) {
            const increment = delta * (copy + 1);
            // 复制坏部中的每个元素
            for (let i = 0; i < badPart.indices.length; i++) {
                const idx = badPart.indices[i];
                const diffIdx = badPart.diffIndices[i];
                const originalValue = seq[idx];
                const originalDiff = mountain.diffSeq[diffIdx];
                
                // 新值 = 其父项 + 阶差
                const parentIdx = badPart.indices.indexOf(mountain.diffParents[diffIdx]);
                let parentValue;
                if (parentIdx >= 0) {
                    // 父项在坏部中
                    const newParentIdx = badPart.indices.indexOf(mountain.diffParents[diffIdx]);
                    parentValue = resultSeq[resultSeq.length - badPart.indices.length + newParentIdx];
                } else {
                    // 父项不在坏部中（即根元素）
                    parentValue = goodPart[root];
                }
                
                const newValue = parentValue + originalDiff + increment;
                resultSeq.push(newValue);
            }
        }
        
        return resultSeq;
    },
    
    // 计算fundamental sequence的第n项
    FS: function(expr, n) {
        if (expr === Infinity) {
            return [n + 1];
        }
        
        if (!Array.isArray(expr) || expr.length === 0) {
            return [];
        }
        
        // 规则2：末项为1，后继序数
        if (expr[expr.length - 1] === 1) {
            return expr.slice(0, -1);
        }
        
        // 计算阶差序列
        const diffSeq = this.computeDiffSeq(expr);
        
        // 规则3：阶差序列末项为1，按PrSS方式展开
        if (diffSeq[diffSeq.length - 1] === 1) {
            return this.prssExpand(expr);
        }
        
        // 规则4：按山脉图展开
        // 复制n+1次坏部
        const copyCount = n + 1;
        return this.expandMountain(expr, copyCount);
    },
    
    // 可选的alternate FS
    FSalter: function(expr, n) {
        if (expr === Infinity) {
            return [n];
        }
        
        if (!Array.isArray(expr) || expr.length === 0) {
            return [];
        }
        
        if (expr[expr.length - 1] === 1) {
            return expr.slice(0, -1);
        }
        
        const diffSeq = this.computeDiffSeq(expr);
        if (diffSeq[diffSeq.length - 1] === 1) {
            // PrSS的替代展开：复制n次而不是n+1次
            if (expr.length <= 1) return [];
            const last = expr[expr.length - 1];
            let badRoot = -1;
            for (let i = expr.length - 2; i >= 0; i--) {
                if (expr[i] < last) {
                    badRoot = i;
                    break;
                }
            }
            if (badRoot < 0) return expr.slice(0, -1);
            
            const result = expr.slice(0, badRoot + 1);
            const badPart = expr.slice(badRoot + 1, expr.length);
            const delta = last - expr[badRoot] - 1;
            
            for (let i = 0; i < n; i++) {
                for (const val of badPart) {
                    result.push(val + delta * (i + 1));
                }
            }
            return result;
        }
        
        // 山脉图的替代展开：复制n次
        const copyCount = n;
        return this.expandMountain(expr, copyCount);
    },
    
    // 初始化数据
    init: function() {
        return [
            {
                expr: Infinity,
                low: [this.FS(Infinity, 0)],
                subitems: []
            },
            {
                expr: [],
                low: [[]],
                subitems: []
            }
        ];
    }
};

// 注册到全局
if (typeof window !== 'undefined' && window.register) {
    window.register.push(hprss);
} else {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = hprss;
    }
}