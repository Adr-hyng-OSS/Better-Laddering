class Compare {
}
Compare.locations = class {
    static isEqual(a, b) {
        return a.x === b.x && a.y === b.y && a.z === b.z;
    }
};
Compare.types = class {
    static isEqual(a, b) {
        if (a.constructor !== b.constructor) {
            throw new Error("Types of a and b are not the same");
        }
        return a === b;
    }
};
export { Compare };
