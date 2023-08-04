class CBlock {
    constructor(block) {
        this.block = block;
    }
    get location() {
        return this.block.location;
    }
    toString() {
        return `Block Location: ${this.location.x}, ${this.location.y}, ${this.location.z}`;
    }
}
export { CBlock };
