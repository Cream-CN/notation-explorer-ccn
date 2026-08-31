// LPrSS (Low-level Primitive Sequence System) 实现
// 基于原始数列系统，但使用不同的坏根判定规则

const lprss = {
    id: 'lprss',
    name: 'HPrSS',
    
    // 将表达式转换为可读的HTML字符串
    display: function(expr) {
        if (!expr || expr.length === 0) return '0';
        if (expr === Infinity) return '∞';
        if (!Array.isArray(expr)) return String(expr);
        return '(' + expr.map(String).join(',') + ')';
    },
    
    // 判断是否为极限序数
    able: function(expr) {
        if (expr === Infinity) return true;
        if (!Array.isArray(expr) || expr.length === 0) return false;
        // 如果最后一个元素是1，则是后继序数，不是极限
        if (expr[expr.length - 1] === 1) return false;
        // 否则是极限序数（长度>0且最后元素>1）
        return true;
    },
    
    // 比较两个表达式
    compare: function(a, b) {
        // 处理Infinity
        if (a === Infinity && b === Infinity) return 0;
        if (a === Infinity) return 1;
        if (b === Infinity) return -1;
        
        // 处理空序列
        if (!Array.isArray(a) || a.length === 0) {
            if (!Array.isArray(b) || b.length === 0) return 0;
            return -1;
        }
        if (!Array.isArray(b) || b.length === 0) return 1;
        
        // 长度比较
        const minLen = Math.min(a.length, b.length);
        for (let i = 0; i < minLen; i++) {
            if (a[i] < b[i]) return -1;
            if (a[i] > b[i]) return 1;
        }
        
        // 所有对应元素相等，比较长度
        if (a.length < b.length) return -1;
        if (a.length > b.length) return 1;
        return 0;
    },
    
    // 寻找坏根：在最后一个元素左边，且小于最后一个元素的第一个元素
    findBadRoot: function(seq) {
        if (seq.length < 2) return -1;
        const last = seq[seq.length - 1];
        // 从倒数第二个元素开始向左搜索
        for (let i = seq.length - 2; i >= 0; i--) {
            if (seq[i] < last) {
                return i;
            }
        }
        return -1;
    },
    
    // 计算阶差
    computeDelta: function(seq, badRootIdx) {
        if (badRootIdx < 0 || badRootIdx >= seq.length - 1) return 0;
        return seq[seq.length - 1] - seq[badRootIdx] - 1;
    },
    
    // 复制坏部并应用增量
    expandBadPart: function(seq, badRootIdx, copyCount) {
        if (badRootIdx < 0 || badRootIdx >= seq.length - 1) return seq.slice(0, -1);
        
        const result = seq.slice(0, badRootIdx + 1); // 好部 + 坏根
        const badPart = seq.slice(badRootIdx + 1, seq.length - 1); // 坏部（不包含最后一个元素）
        const delta = this.computeDelta(seq, badRootIdx);
        
        for (let i = 0; i < copyCount; i++) {
            const increment = delta * (i + 1);
            for (const val of badPart) {
                result.push(val + increment);
            }
        }
        
        return result;
    },
    
    // 计算fundamental sequence的第n项
    FS: function(expr, n) {
        if (expr === Infinity) {
            // Infinity的FS: 返回递增的有限序列
            return [n + 1];
        }
        
        if (!Array.isArray(expr) || expr.length === 0) {
            return []; // 0的FS是0
        }
        
        // 后继情况: expr末尾为1
        if (expr[expr.length - 1] === 1) {
            return expr.slice(0, -1);
        }
        
        // 极限情况
        const badRootIdx = this.findBadRoot(expr);
        if (badRootIdx < 0) {
            // 如果没有坏根（不应该发生），去掉最后一个元素
            return expr.slice(0, -1);
        }
        
        // 计算基本序列：复制n+1次坏部
        const copyCount = n + 1;
        return this.expandBadPart(expr, badRootIdx, copyCount);
    },
    
    // 可选的alternate FS (Shift+点击使用)
    FSalter: function(expr, n) {
        // 对于LPrSS，使用不同的展开策略：复制n次而不是n+1次
        if (expr === Infinity) {
            return [n];
        }
        
        if (!Array.isArray(expr) || expr.length === 0) {
            return [];
        }
        
        if (expr[expr.length - 1] === 1) {
            return expr.slice(0, -1);
        }
        
        const badRootIdx = this.findBadRoot(expr);
        if (badRootIdx < 0) {
            return expr.slice(0, -1);
        }
        
        // 复制n次（而不是n+1次）
        const copyCount = n;
        return this.expandBadPart(expr, badRootIdx, copyCount);
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
    window.register.push(lprss);
} else {
    // 如果不在浏览器环境中，导出模块
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = lprss;
    }
}