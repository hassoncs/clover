import type { Env } from './trpc/context';

declare module 'cloudflare:test' {
  interface ProvidedEnv extends Env {}
}
