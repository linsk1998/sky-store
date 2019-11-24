declare module "sky-store" {
    const OPTIONS: unique symbol;
    export interface IStore {
        [OPTIONS]: IStoreOptions;
    }
    export interface IStoreOptions {
        watchers: [string, Function][];
        target: any;
        computedFrom: [string, IStore, string][];
        computedTo: [string, IStore, string][];
        name?: string;
        path?: string;
    }
    export function watch(store: any, key: string, callback: (store: IStore, key: string) => void): void;
    export function dirct(prototype: any, prop: string): void;
    export function observable(prototype: any, prop: string): void;
    export function computed(prototype: any, prop: string, descriptor?: PropertyDescriptor): void;
    export namespace computed {
        var method: (prototype: any, prop: string, undefined?: PropertyDescriptor) => void;
        var accessor: (prototype: any, prop: string, descriptor: PropertyDescriptor) => void;
    }
    export function action(prototype: any, prop: string, undefined?: PropertyDescriptor): void;
    export function store(Store: any): any;
    export function startRender(): void;
    export function endRender(): void;
    export class Binding {
        name: string;
        value: any;
        path: string;
        constructor(name: string, value: any, path: string);
        valueOf(): any;
    }
}
