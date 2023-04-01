import { Lane, mergeLanes, getHighestPriorityLane, NoLane, SyncLane, markRootFinished, lanesToSchedulerPriority } from './fiberLanes';
import { commitHookEffectLisCreate, commitHookEffectLisDestory, commitHookEffectListUnmount, commitMutationEffects } from './commitWork';
import { MutationMask, NoFlags, PassiveMask } from './ReactFiberFlags';
import { HostRoot } from './ReactWorkTags';
import { beginWork } from './ReactFiberBeginWork'
import { FiberNode, FiberRootNode, createWorkInProgress, PendingPassiveEffects } from "./ReactFiber"
import { completeWork } from './ReactFiberCompleteWork'
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue';
import { scheduleMicroTask } from 'hostConfig';
import { cancelCallback, NormalPriority, scheduleCallback, shouldYield } from 'scheduler'
import { Passive, HookHasEffect } from './hookEffectTags';


// root 执行后的状态，中断执行还是执行完毕
const RootInComplete = 1
const RootCompleted = 2
// TODO: 异常导致的中断
type RootExistStatus = typeof RootInComplete | typeof RootCompleted

let workInProgress: FiberNode | null = null
let workInProgressRenderLane: Lane = NoLane
let rootDoesHasPassiveEffects = false


export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
  // 找到根节点
  const root = markUpdateFromFiberToRoot(fiber) as FiberRootNode
  // 收集lane
  markRootUpdated(root, lane)
  ensureRootIsScheduled(root)
}

function ensureRootIsScheduled(root: FiberRootNode) {
  // 获取最高等级的lane
  const updateLane = getHighestPriorityLane(root.pendingLanes)
  const existingCallback = root.callbackNode
  if (updateLane === NoLane) {
    if (existingCallback !== null) {
      cancelCallback(existingCallback)
    }
    root.callbackNode = null
    root.callbackPriority = NoLane
    return
  }

  const curPriority = updateLane
  const prevPriority = root.callbackPriority
  if (curPriority === prevPriority) {
    // 此时表明当前有任务还没有执行完，然后被中断了， 不需要往后执行
    // 因为 performConcurrentWorkOnRoot 的返回值是一个函数，然后scheduler库会继续调度执行
    return
  }

  if (existingCallback !== null) {
    // 此时更高优先级的任务打断了当前的任务，取消当前的任务
    cancelCallback(existingCallback)
  }

  let newCallback = null

  if (updateLane === SyncLane) {
    // 同步任务使用 微任务调度
    // 将任务入队
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane))
    // 使用微任务调度 flushSyncCallbacks， 解决批处理 eg： 多次调用setState的问题
    scheduleMicroTask(flushSyncCallbacks)
  } else {
    // 使用宏任务调度
    const schedulerPriority = lanesToSchedulerPriority(updateLane)
    newCallback = scheduleCallback(schedulerPriority, performConcurrentWorkOnRoot.bind(null, root))
  }
  // 同步更新，root.callbackNode 为 null
  root.callbackNode = newCallback
  root.callbackPriority = curPriority
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
  root.pendingLanes = mergeLanes(root.pendingLanes, lane)
}

function markUpdateFromFiberToRoot(fiber: FiberNode) {
  let node = fiber
  let parent = node.return
  while (parent !== null) {
    node = parent
    parent = node.return
  }
  if (node.tag === HostRoot) {
    return node.stateNode
  }
  return null
}

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
  root.finishedLane = NoLane
  root.finishedWork = null
  // performSyncWorkOnRoot 时，会创建一个workInprogress(hostRoot)
  // 也就是说，即使是mount时，hostRoot也是存在current和workinprogress
  // 所在beginwork时 也就一直走的是 reconcileChild而不是mountChild
  // 也就会标记上update， 这也是一种性能优化
  workInProgress = createWorkInProgress(root.current, {})
  workInProgressRenderLane = lane
}


function performConcurrentWorkOnRoot(root: FiberRootNode, didTimeout: boolean): any {
  const curCallbackNode = root.callbackNode
  // 保证 useEffect 的回调都被执行
  // 为什么那，因为useEffect回调里有可能有更高优先级的调度，打断当前的调度，确保更高优先级调度的任务执行
  const didFlushPassiveEffect = flushPassiveEffects(root.pendingPassiveEffects)
  if (didFlushPassiveEffect) {
    if (curCallbackNode !== root.callbackNode) {
      // 有更高优先级的任务被执行了，因为root的callbackNode 被改变了
      return null
    }
  }

  const lane = getHighestPriorityLane(root.pendingLanes)

  if (lane === NoLane) {
    return null
  }

  const needSync = lane === SyncLane || didTimeout
  // render 阶段
  const existStatus = renderRoot(root, lane, !needSync)
  ensureRootIsScheduled(root)

  if (existStatus === RootInComplete) {
    // 中断
    if (root.callbackNode !== curCallbackNode) {
      // 表示更高优先级任务插进来了
      return null
    }
    // 继续调度当前的回调函数
    return performConcurrentWorkOnRoot.bind(null, root)
  }

  if (existStatus === RootCompleted) {
    const finishedWork = root.current.alternate
    root.finishedWork = finishedWork
    root.finishedLane = lane
    markRootFinished(root, lane)
    commitRoot(root)
  }
  return null
}

// 如何去触发该函数
// 1. React.createRoot(Element).render(app)
// 2. setState
// 3. useState 的 dispatch
// 使用Update代表更新机制， 消费update的数据结构updatequeue
function performSyncWorkOnRoot(rootFiber: FiberRootNode) {
  // 当前传入的lane 是 syncelane
  const nextLane = getHighestPriorityLane(rootFiber.pendingLanes)
  if (nextLane !== SyncLane) {
    // 走到这是调度的syncLane的任务，但是，从rootFiber.pendingLanes 获取的最高等级的lane，不是synclane
    // 没有任务，或者是比syncLane更低的任务
    // 不出意外的话，走到这里的条件其实是批处理
    ensureRootIsScheduled(rootFiber)
    return
  }

  const existStatus = renderRoot(rootFiber, nextLane, false)
  // render 阶段结束
  if (existStatus === RootCompleted) {
    const finishedWork = rootFiber.current.alternate
    rootFiber.finishedWork = finishedWork
    rootFiber.finishedLane = nextLane
    workInProgressRenderLane = NoLane
    commitRoot(rootFiber)
  } else if (__DEV__) {
    console.error('暂未实现同步更新结束状态')
  }

}

function renderRoot(root: FiberRootNode, lane: Lane, shouldTimeSlice: boolean): RootExistStatus {
  if (__DEV__) {
    console.log(`开始${shouldTimeSlice ? '并发' : '同步'}任务`)
  }
  // 中断继续可以走到这儿，所以要判断一下， 初始化做个限制
  if (workInProgressRenderLane !== lane) {
    // lane 不相等 说明是新开始的render， 相等，说明是被中断的任务继续开始，不需要再初始化
    // 初始化
    prepareFreshStack(root, lane)
  }

  do {
    try {
      shouldTimeSlice ? workLoopConcurrent() : workLoopSync()
      break
    } catch (error) {
      if (__DEV__) {
        // 错误边界处理
        console.warn('work loop 发生错误：', error)
      }
      workInProgress = null
    }
  } while (true)
  // 中断执行 || 执行完毕 || 异常导致的中断

  if (shouldTimeSlice && workInProgress !== null) {
    // 中断执行的情况
    return RootInComplete
  }

  if (!shouldTimeSlice && workInProgress !== null && __DEV__) {
    console.error('render阶段结束出现异常执行异常: workInProgress不会null')
  }
  // TODO: 报错
  return RootCompleted
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
  // 是否有回调被执行
  let didFlushPassiveEffect = false
  // 执行组件卸载的 destory
  pendingPassiveEffects.unmount.forEach((effect) => {
    didFlushPassiveEffect = true
    // 后续有useLayout的destory可以传入Layout
    commitHookEffectListUnmount(Passive, effect)
  })
  pendingPassiveEffects.unmount = []
  // update
  pendingPassiveEffects.update.forEach(effect => {
    didFlushPassiveEffect = true
    // 先执行destory, effect 需要有Passive和HookHasEffect的标记才会被执行
    commitHookEffectLisDestory(Passive | HookHasEffect, effect)
  })
  // 执行create
  pendingPassiveEffects.update.forEach(effect => {
    didFlushPassiveEffect = true
    // 先执行destory, effect 需要有Passive和HookHasEffect的标记才会被执行
    commitHookEffectLisCreate(Passive | HookHasEffect, effect)
  })
  pendingPassiveEffects.update = []
  // 有可能在effect里面产生的更新，
  flushSyncCallbacks()
  return didFlushPassiveEffect
}

function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork
  if (finishedWork === null) {
    return
  }
  if (__DEV__) {
    console.warn('commitRoot 待完成beforemutation阶段')
  }

  // 在进行三个子阶段前，调度useEffect
  if ((finishedWork.flags & PassiveMask) !== NoFlags || (finishedWork.subtreeFlags & PassiveMask) !== NoFlags) {
    if (rootDoesHasPassiveEffects) {
      return
    }
    rootDoesHasPassiveEffects = true
    // 调度副作用
    scheduleCallback(NormalPriority, (_didTimeout) => {
      // 执行副作用
      flushPassiveEffects(root.pendingPassiveEffects)
      return undefined
    })
  }

  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags
  const subtreeHasEffect = (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  if (rootHasEffect || subtreeHasEffect) {
    // beforeMutation
    // mutation
    commitMutationEffects(finishedWork, root)
    const lane = root.finishedLane

    root.current = finishedWork
    root.finishedWork = null
    root.finishedLane = NoLane
    // 从root中移除该lane
    markRootFinished(root, lane)

    // layout
  } else {
    // do something
  }

  rootDoesHasPassiveEffects = false
  ensureRootIsScheduled(root)
}

function workLoopConcurrent() {
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress)
  }
}

// 源码 workLoopConcurrent workLoopSync
function workLoopSync() {
  while (workInProgress !== null) {
    performUnitOfWork(workInProgress)
  }
}

function performUnitOfWork(fiber: FiberNode) {
  const next = beginWork(fiber, workInProgressRenderLane)
  fiber.memoizedProps = fiber.pendingProps
  if (next === null) {
    // 无子fiber
    completeUnitOfWork(fiber)
  } else {
    workInProgress = next
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber
  do {
    completeWork(node)
    const sibling = node.sibling
    if (sibling !== null) {
      workInProgress = sibling
      return
    }
    node = node.return
    workInProgress = node
  } while (node !== null)
}