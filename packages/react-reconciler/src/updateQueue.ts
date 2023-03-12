import { Lane } from './fiberLanes';
import { Dispatch } from 'react/src/currentDispatcher'
import { Action } from 'shared/ReactTypes'
// 处理update updatequeue 数据结构

export interface Update<State> {
  action: Action<State>
  lane: Lane
  next: Update<any> | null
}

export interface UpdateQueue<State> {
  shared: {
    pending: Update<State> | null
  }
  dispatch: Dispatch<State> | null
}

export const createUpdate = <State>(action: Action<State>, lane: Lane): Update<State> => {
  return {
    action,
    lane,
    next: null
  }
}

export const createUpdateQueue = <State>(): UpdateQueue<State> => {
  return {
    shared: {
      pending: null
    },
    dispatch: null
  }
}

export const enqueueUpdate = <State>(
  updateQueue: UpdateQueue<State>,
  update: Update<State>
) => {
  // updateQueue 保存的是一个环状链表
  const pending = updateQueue.shared.pending // 最后一个update
  if (pending === null) {
    // 第一个update
    update.next = update
  } else {
    update.next = pending.next
    pending.next = update
  }
  // 保持 updateQueue指向最后一个Update
  updateQueue.shared.pending = update
}

export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null,
  lane: Lane
): { memoizedState: State } => {
  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memoizedState: baseState
  }

  if (pendingUpdate !== null) {
    let update: Update<any> = pendingUpdate.next!
    const firstUpdate = pendingUpdate.next
    do {
      if (lane === update.lane) {
        const action = update.action
        if (action instanceof Function) {
          baseState = action(baseState)
        } else {
          baseState = action
        }
      } else {
        if (__DEV__) {
          console.warn('目前进入该逻辑异常')
        }
      }
      update = update.next!
    } while (update !== firstUpdate)
  }

  result.memoizedState = baseState
  return result
}