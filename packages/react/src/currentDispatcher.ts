import { Action } from 'shared/ReactTypes'

export type Dispatch<State> = (v: Action<State>) => void

export interface Dispatcher {
  useState: <T>(v: T | (() => T)) => ([T, Dispatch<T>])
}

export const currentDispatcher = {
  current: null
}

export const resolveDispatcher = (): Dispatcher => {
  if (!currentDispatcher.current) {
    throw new Error("hook只能用在函数组件中执行");
  }
  return currentDispatcher.current
}
