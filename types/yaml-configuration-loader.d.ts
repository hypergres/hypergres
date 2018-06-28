declare module 'yaml-configuration-loader' {
  // tslint:disable-next-line:unified-signatures
  export function load(name: string, path: string): {};
  export function load(path: string): {};

  export function get(name: string): {};

  export function define(name: string, value: any): void;

  export function clear(): void;
}
