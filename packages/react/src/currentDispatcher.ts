import { Action } from 'shared/ReactTypes'

export type Dispatch<State> = (v: Action<State>) => void

export interface Dispatcher {
  useState: <T>(v: T | (() => T)) => ([T, Dispatch<T>])
  useEffect: (callback: () => void | void, deps: any[] | void) => void
}

export const currentDispatcher: {
  current: Dispatcher | null
} = {
  current: null
}

export const resolveDispatcher = (): Dispatcher => {
  if (!currentDispatcher.current) {
    throw new Error("hook只能用在函数组件中执行");
  }
  return currentDispatcher.current
}
