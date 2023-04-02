import { Passive, HookHasEffect } from './hookEffectTags';
import { Flags, PassiveEffect } from './ReactFiberFlags';
import { Dispatch } from 'react/src/currentDispatcher';
import { createUpdate, createUpdateQueue, enqueueUpdate, UpdateQueue, processUpdateQueue, Update } from './updateQueue';
import { Dispatcher } from 'react/src/currentDispatcher'
import internals from 'shared/internals'
import { Action } from 'shared/ReactTypes'
import { FiberNode } from './ReactFiber'
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop';
import { requestUpdateLane, NoLane, Lane } from './fiberLanes';

// 当前正在处理的functionComponent context
let currentlyRenderingFiber: FiberNode | null = null
// 当前正在处理的hook
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null
let workInProgressUpdateLane: Lane = NoLane

const { currentDispatcher } = internals
export interface Hook {
  memoizeState: any
  updateQueue: unknown
  next: Hook | null
  // 保存的对应的wip的hook的baseQueue
  baseQueue: Update<any> | null
  baseState: any
}
export interface Effect {
  tag: Flags
  create: EffectCallback | void
  destory: EffectCallback | void
  deps: EffectDeps
  next: Effect | null
}

export interface FnUpdateQueue<State> extends UpdateQueue<State> {
  lastEffect: null | Effect
}

type EffectCallback = () => void
type EffectDeps = any[] | null

export function renderWithHooks(wip: FiberNode, lane: Lane) {
  // 赋值，标记当前所在的context
  currentlyRenderingFiber = wip
  // 重置hooks链表
  wip.memoizedState = null
  // 重置 effect 链表
  wip.updateQueue = null
  workInProgressUpdateLane = lane

  const current = wip.alternate
  if (current !== null) {
    // update
    currentDispatcher.current = HooksDispatcherOnUpdate
  } else {
    // mount
    currentDispatcher.current = HooksDispatcherOnMount
  }
  const Component = wip.type
  const pendingProps = wip.pendingProps
  const children = Component(pendingProps)

  // 重置
  currentlyRenderingFiber = null
  workInProgressHook = null
  currentHook = null
  workInProgressUpdateLane = NoLane
  return children
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState,
  useEffect: mountEffect
}

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState,
  useEffect: updateEffect
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
  // 获取当前对应的hook
  const effectHook = updateWorkInProgressHook()
  const nextDeps = deps === undefined ? null : deps

  if (effectHook !== null) {
    const prevEffect = effectHook.memoizeState as Effect
    const prevDeps = prevEffect.deps
    const destory = prevEffect.destory
    if (areHookInputsEqual(prevDeps, nextDeps)) {
      // 依赖相等
      effectHook.memoizeState = pushEffect(Passive, create, destory, nextDeps)
    } else {
      effectHook.memoizeState = pushEffect(Passive | HookHasEffect, create, destory, nextDeps)
      // 标记该fiber有hooks副作用
      currentlyRenderingFiber!.flags |= PassiveEffect
    }
  }
}

function areHookInputsEqual(prevDeps: EffectDeps, nextDeps: EffectDeps) {
  if (prevDeps === null || nextDeps === null) {
    return false
  }
  if (prevDeps.length !== nextDeps.length) {
    return false
  }
  for (let i = 0; i < prevDeps.length; i++) {
    if (Object.is(prevDeps[i], nextDeps[i])) {
      continue
    }
    return false
  }
  return true
}

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
  const hook = mountWorkInProgressHook()
  const nextDeps = deps === undefined ? null : deps;
  // 标记fiber
  (currentlyRenderingFiber as FiberNode).flags |= PassiveEffect
  // 处理Effect入队
  hook.memoizeState = pushEffect(Passive | HookHasEffect, create, undefined, nextDeps)
}

function createEffectUpdateQueue<State>() {
  const updateQueue = createUpdateQueue<State>() as FnUpdateQueue<State>
  updateQueue.lastEffect = null
  return updateQueue
}

function pushEffect(
  hookFlags: Flags,
  create: EffectCallback | void,
  destory: EffectCallback | void,
  deps: EffectDeps
) {
  // 将effect挂到fiber的updateQueue上
  const effect: Effect = {
    tag: hookFlags,
    create,
    destory,
    deps,
    next: null
  }
  const fiber = currentlyRenderingFiber as FiberNode
  let updateQueue = fiber.updateQueue as FnUpdateQueue<any>
  if (updateQueue === null) {
    updateQueue = createEffectUpdateQueue()
    fiber.updateQueue = updateQueue
    effect.next = effect
    updateQueue.lastEffect = effect
  } else {
    if (updateQueue.lastEffect === null) {
      effect.next = effect
      updateQueue.lastEffect = effect
    } else {
      const firstEffect = updateQueue.lastEffect.next
      updateQueue.lastEffect.next = effect
      effect.next = firstEffect
      updateQueue.lastEffect = effect
    }
  }

  return effect
}

function updateState<State>() {
  // 找到当前 useState 对应的hook
  const hook = updateWorkInProgressHook()
  const queue = hook.updateQueue as UpdateQueue<State>
  const baseState = hook.baseState
  const current = currentHook as Hook
  let baseQueue = current.baseQueue
  const pending = queue.shared.pending
  if (__DEV__) {
    console.warn('baseState应该是从current里取')
  }
  // 每次计算完updateQueue后不能直接赋值为null， 因为有高优先级任务打断低优先级，可能会进行多次render， 导致updateQueue还没有计算完，就被置空了
  // 那么可以考虑把update保存到current中， 只要不进入commit阶段，wip和current就不会互换， 所以保存在current中，即使多次执行render阶段
  // 只要不进入commit阶段，都能从current中恢复数据
  // queue.shared.pending = null
  if (pending !== null) {
    // 1. update (pending, baseQueue) 保存在current中
    if (baseQueue !== null) {
      const baseQueueFirst = baseQueue.next
      const pendingQueueFirst = pending.next

      baseQueue.next = pendingQueueFirst
      pending.next = baseQueueFirst
    }
    baseQueue = pending
    // 保存在current中
    current.baseQueue = pending
    queue.shared.pending = null
    if (baseQueue !== null) {
      const { memoizedState, baseState: newBaseState, baseQueue: newBaseQueue } = processUpdateQueue(baseState, baseQueue, workInProgressUpdateLane)
      // 如果该更新走到commit阶段，那么该hook就是currentHook
      // 如果该更新没有走到commit阶段，那么下次计算时继续从currentHook中取updateQueue
      hook.memoizeState = memoizedState
      hook.baseQueue = newBaseQueue
      hook.baseState = newBaseState
    }
  }
  return [hook.memoizeState, queue.dispatch] as [State, Dispatch<State>]
}

function updateWorkInProgressHook() {
  let nextCurrentHook: Hook | null = null
  if (currentHook === null) {
    // 第一个hook
    const current = currentlyRenderingFiber!.alternate
    if (current !== null) {
      nextCurrentHook = current.memoizedState
    } else {
      nextCurrentHook = null
    }
  } else {
    nextCurrentHook = currentHook.next
  }
  if (nextCurrentHook === null) {
    throw new Error("hook 链表前后不一致，可能是你的hook写在了判断里面，请确保一直会用该hook");
  }

  currentHook = nextCurrentHook
  const newHook: Hook = {
    memoizeState: currentHook.memoizeState,
    updateQueue: currentHook.updateQueue,
    next: null,
    baseQueue: currentHook.baseQueue,
    baseState: currentHook.baseState
  }

  if (workInProgressHook === null) {
    if (currentlyRenderingFiber === null) {
      throw new Error("请在函数组件中使用hook")
    } else {
      // update时 第一个hook
      currentlyRenderingFiber.memoizedState = newHook
      workInProgressHook = newHook
    }
  } else {
    workInProgressHook.next = newHook
    workInProgressHook = newHook
  }

  return workInProgressHook
}

function mountState<State>(
  initialState: State | (() => State)
): [State, Dispatch<State>] {
  // 找到当前useState对应的Hook数据
  const hook = mountWorkInProgressHook()
  let memoizedState
  // const [num, setNum] = useState(1)
  if (initialState instanceof Function) {
    memoizedState = initialState()
  } else {
    memoizedState = initialState
  }
  hook.memoizeState = memoizedState

  const updateQueue = createUpdateQueue<State>()
  hook.updateQueue = updateQueue
  // @ts-ignore
  const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, updateQueue)
  updateQueue.dispatch = dispatch
  return [memoizedState, dispatch]
}

function dispatchSetState<State>(
  fiber: FiberNode,
  updateQueue: UpdateQueue<State>,
  action: Action<State>
) {
  const lane = requestUpdateLane()
  // setState 触发
  const update = createUpdate(action, lane)
  enqueueUpdate(updateQueue, update)

  // 触发更新
  scheduleUpdateOnFiber(fiber, lane)
}

function mountWorkInProgressHook() {
  const hook: Hook = {
    memoizeState: null,
    updateQueue: null,
    next: null,
    baseQueue: null,
    baseState: null
  }
  if (workInProgressHook === null) {
    if (currentlyRenderingFiber === null) {
      throw new Error("请在函数组件中使用hook")
    } else {
      // mount时 第一个hook
      currentlyRenderingFiber.memoizedState = hook
      workInProgressHook = hook
    }
  } else {
    workInProgressHook.next = hook
    workInProgressHook = hook
  }
  return workInProgressHook
}
