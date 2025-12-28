
export class EventEmitter {
    private events: Record<string, Function[]>;

    constructor() {
        this.events = {};
    }

    on(event: string, listener: Function) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
        return () => this.off(event, listener);
    }

    off(event: string, listener: Function) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(l => l !== listener);
    }

    emit(event: string, ...args: any[]) {
        if (!this.events[event]) return;
        this.events[event].forEach(listener => listener(...args));
    }

    once(event: string, listener: Function) {
        const remove = this.on(event, (...args: any[]) => {
            remove();
            listener(...args);
        });
    }
}
