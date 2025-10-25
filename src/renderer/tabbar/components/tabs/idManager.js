export class IdManager {
    constructor() {
        this.nextId = 1;
        this.freeIds = [];
    }

    getNewId() {
        if (this.freeIds.length > 0) {
            return this.freeIds.shift();
        }
        const id = this.nextId;
        this.nextId++;
        return id;
    }

    releaseId(id) {
        if (!id || this.freeIds.includes(id)) {
            return;
        }

        this.freeIds.push(id);
        this.freeIds.sort((a, b) => a - b);
    }

    reset() {
        this.nextId = 1;
        this.freeIds = [];
    }

    getStats() {
        return {
            nextId: this.nextId,
            freeIdsCount: this.freeIds.length,
            freeIds: [...this.freeIds]
        };
    }
}