import { Dispatch } from 'react/src/currentDispatcher';
import { createUpdate, createUpdateQueue, enqueueUpdate, UpdateQueue } from './updateQueue';
import { Dispatcher } from 'react/src/currentDispatcher'
import internals from 'shared/internals'
import { Action } from 'shared/ReactTypes'
import { FiberNode } from './ReactFiber'
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop';

// 当前正在处理的functionComponent context
let currentlyRenderingFiber: FiberNode | null = null
// 当前正在处理的hook
let workInProgressHook: Hook | null = null

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
  } else {
    // mount
    currentDispatcher.current = HooksDispatcherOnMount
  }
  const Component = wip.type
  const pendingProps = wip.pendingProps
  const children = Component(pendingProps)

  // 重置
  currentlyRenderingFiber = null
  return children
}

const HooksDispatcherOnMount: Dispatcher = {
  useState: mountState
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
