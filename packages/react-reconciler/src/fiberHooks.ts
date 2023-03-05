import { Dispatch } from 'react/src/currentDispatcher';
import { createUpdate, createUpdateQueue, enqueueUpdate, UpdateQueue, processUpdateQueue } from './updateQueue';
import { Dispatcher } from 'react/src/currentDispatcher'
import internals from 'shared/internals'
import { Action } from 'shared/ReactTypes'
import { FiberNode } from './ReactFiber'
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop';

// 当前正在处理的functionComponent context
let currentlyRenderingFiber: FiberNode | null = null
// 当前正在处理的hook
let workInProgressHook: Hook | null = null
let currentHook: Hook | null = null

const { currentDispatcher } = internals
export interface Hook {
  memoizeState: any
  updateQueue: unknown
  next: Hook | null
}

export function renderWithHooks(wip: FiberNode) {
  // 赋值，标记当前所在的context
  currentlyRenderingFiber = wip
  // 重置
  wip.memoizedState = null

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
  return children
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState
}

const HooksDispatcherOnUpdate: Dispatcher = {
  useState: updateState
}

function updateState<State>() {
  // 找到当前 useState 对应的hook
  const hook = updateWorkInProgressHook()
  const queue = hook.updateQueue as UpdateQueue<State>
  const pending = queue.shared.pending
  if (pending !== null) {
    const { memoizedState } = processUpdateQueue(hook.memoizeState, pending)
    hook.memoizeState = memoizedState
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
    next: null
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
  // setState 触发
  const update = createUpdate(action)
  enqueueUpdate(updateQueue, update)

  // 触发更新
  scheduleUpdateOnFiber(fiber)
}

function mountWorkInProgressHook() {
  const hook: Hook = {
    memoizeState: null,
    updateQueue: null,
    next: null
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
