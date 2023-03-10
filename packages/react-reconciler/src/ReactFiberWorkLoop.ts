import { Lane, mergeLanes, getHighestPriorityLane, NoLane, SyncLane, markRootFinished } from './fiberLanes';
import { commitMutationEffects } from './commitWork';
import { MutationMask, NoFlags } from './ReactFiberFlags';
import { HostRoot } from './ReactWorkTags';
import { beginWork } from './ReactFiberBeginWork'
import { FiberNode, FiberRootNode, createWorkInProgress } from "./ReactFiber"
import { completeWork } from './ReactFiberCompleteWork'
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue';
import { scheduleMicroTask } from 'hostConfig';

let workInprogress: FiberNode | null = null
let workInProgressRenderLane: Lane = NoLane

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
  if (updateLane === NoLane) {
    return
  }

  if (updateLane === SyncLane) {
    // 同步任务使用 微任务调度
    if (__DEV__) {
      console.log('使用微任务调度---')
    }
    // 将任务入队
    scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane))
    // 使用微任务调度 flushSyncCallbacks， 解决批处理 eg： 多次调用setState的问题
    scheduleMicroTask(flushSyncCallbacks)
  } else {
    // 使用宏任务调度
    if (__DEV__) {
      console.log('暂未实现的lane')
    }
  }
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
  // performSyncWorkOnRoot 时，会创建一个workInprogress(hostRoot)
  // 也就是说，即使是mount时，hostRoot也是存在current和workinprogress
  // 所在beginwork时 也就一直走的是 reconcileChild而不是mountChild
  // 也就会标记上update， 这也是一种性能优化
  workInprogress = createWorkInProgress(root.current, {})
  workInProgressRenderLane = lane
}

// 如何去触发该函数
// 1. React.createRoot(Element).render(app)
// 2. setState
// 3. useState 的 dispatch
// 使用Update代表更新机制， 消费update的数据结构updatequeue
function performSyncWorkOnRoot(rootFiber: FiberRootNode, lane: Lane) {
  const nextLane = getHighestPriorityLane(rootFiber.pendingLanes)
  if (nextLane !== SyncLane) {
    // 没有任务，或者是比syncLane更低的任务
    ensureRootIsScheduled(rootFiber)
    return
  }
  prepareFreshStack(rootFiber, lane)
  do {
    try {
      workloop()
      break
    } catch (error) {
      if (__DEV__) {
        // 错误边界处理
        console.warn('work loop 发生错误：', error)
      }
      workInprogress = null
    }
  } while (true);

  const finishedWork = rootFiber.current.alternate
  rootFiber.finishedWork = finishedWork
  rootFiber.finishedLane = lane
  workInProgressRenderLane = NoLane
  commitRoot(rootFiber)
}

function commitRoot(root: FiberRootNode) {
  const finishedWork = root.finishedWork
  if (finishedWork === null) {
    return
  }
  if (__DEV__) {
    console.warn('commitRoot 待完成beforemutation阶段')
  }

  const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags
  const subtreeHasEffect = (finishedWork.subtreeFlags & MutationMask) !== NoFlags
  if (rootHasEffect || subtreeHasEffect) {
    // beforeMutation
    // mutation
    commitMutationEffects(finishedWork)
    const lane = root.finishedLane

    root.current = finishedWork
    root.finishedWork = null
    root.finishedLane = NoLane
    markRootFinished(root, lane)

    // layout
  } else {
    // do something
  }

}

// 源码 workLoopConcurrent workLoopSync
function workloop() {
  while (workInprogress !== null) {
    performUnitOfWork(workInprogress)
  }
}

function performUnitOfWork(fiber: FiberNode) {
  const next = beginWork(fiber, workInProgressRenderLane)
  fiber.memoizedProps = fiber.pendingProps
  if (next === null) {
    // 无子fiber
    completeUnitOfWork(fiber)
  } else {
    workInprogress = next
  }
}

function completeUnitOfWork(fiber: FiberNode) {
  let node: FiberNode | null = fiber
  do {
    completeWork(node)
    const sibling = node.sibling
    if (sibling !== null) {
      workInprogress = sibling
      return
    }
    node = node.return
    workInprogress = node
  } while (node !== null)
}