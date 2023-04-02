import { Lane, isSubsetOfLanes, NoLane } from './fiberLanes';
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

// 新增 baseState、baseQueue 字段：
// 1. baseState 是本次更新参与计算的初始 state， memoizedState 是上次更新计算的最终state(显示到页面上的)
// 2. 如果本次更新没有 update 被跳过，则下次更新开始时 baseState === memoizedState
// 3. 如果本次更新有 update 被跳过，则本次更新计算出的 memoizedState 为【考虑优先级】情况下计算的结果，baseState为【最后一个没有被跳过的update计算后的结果】
//    下次更新开始时，baseState !== memoizedState
// 4. 本次更新 【被跳过的update 及其后面的所有update】都会被保存在baseQueue中 参与下次state计算
// 5. 本次更新【参与计算但保存在baseQueue中的update】，优先级会降低到NoLane

export const processUpdateQueue = <State>(
  baseState: State,
  pendingUpdate: Update<State> | null,
  renderLane: Lane
): {
  memoizedState: State
  baseState: State
  baseQueue: Update<State> | null
} => {
  const result: ReturnType<typeof processUpdateQueue<State>> = {
    memoizedState: baseState,
    baseState,
    baseQueue: null
  }

  if (pendingUpdate !== null) {
    let update: Update<any> = pendingUpdate.next!
    const firstUpdate = pendingUpdate.next
    // 该 update 的 lane
    const updateLane = update.lane
    // 最后一次没有被跳过的update计算结果
    let newBaseState = baseState
    let newBaseQueueFirst = null
    let newBaseQueueLast = null
    // 每次计算的结果
    let newState: State = baseState

    do {
      if (!isSubsetOfLanes(renderLane, updateLane)) {
        // 该 update 不在本次render内, 跳过该update
        const clone = createUpdate(update.action, update.lane)
        if (newBaseQueueLast === null) {
          // 第一个被跳过的update
          newBaseQueueFirst = clone
          newBaseQueueLast = clone
          // 改值已被固定，作为下一次进行运算的 baseState
          newBaseState = newState
        } else {
          // 不是第一个被跳过的update
          newBaseQueueLast.next = clone
          newBaseQueueLast = clone
        }
      } else {
        if (newBaseQueueLast !== null) {
          // 为什么是 NoLane, 为了确保 下一次 该update一定被计算， 因为 isSubsetOfLanes 是取交集
          const clone = createUpdate(update.action, NoLane)
          // 说明之前有被跳过的update
          newBaseQueueLast.next = clone
          newBaseQueueLast = clone
        }
        const action = update.action
        if (action instanceof Function) {
          // TODO: 验证一下是 newState = action(baseState) 还是 newState
          newState = action(newState)
        } else {
          newState = action
        }
      }
      update = update.next!
    } while (update !== firstUpdate)

    if (newBaseQueueLast === null) {
      // 本次计算没有被跳过的update
      newBaseState = newState
    } else {
      // 组成环状链表
      newBaseQueueLast.next = newBaseQueueFirst
    }
    result.baseQueue = newBaseQueueLast
    result.baseState = newBaseState
    result.memoizedState = newState
  }

  return result
}