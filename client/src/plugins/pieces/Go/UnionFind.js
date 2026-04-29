/**
 * UnionFind (Disjoint Set Union) 数据结构
 * 用于高效计算围棋棋子的连通性和气
 */
export class UnionFind {
    constructor(size) {
        this.parent = new Int16Array(size);
        this.reset(size);
    }

    reset(size) {
        for (let i = 0; i < size; i++) {
            this.parent[i] = i;
        }
    }

    find(i) {
        if (this.parent[i] !== i) {
            this.parent[i] = this.find(this.parent[i]); // Path compression
        }
        return this.parent[i];
    }

    union(i, j) {
        const rootI = this.find(i);
        const rootJ = this.find(j);
        if (rootI !== rootJ) {
            this.parent[rootI] = rootJ;
        }
    }
}
