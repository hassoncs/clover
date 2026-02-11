declare module '*.sql?raw' {
  const content: string;
  export default content;
}

declare const __DEV__: boolean;
