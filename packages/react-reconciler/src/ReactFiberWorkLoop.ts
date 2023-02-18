import { commitMutationEffects } from './commitWork';
import { MutationMask, NoFlags } from './ReactFiberFlags';
import { HostRoot } from './ReactWorkTags';
import { beginWork } from './ReactFiberBeginWork'
import { FiberNode, FiberRootNode, createWorkInProgress } from "./ReactFiber"
import { completeWork } from './ReactFiberCompleteWork'

let workInprogress: FiberNode | null = null

export function scheduleUpdateOnFiber(fiber: FiberNode) {
  // 找到根节点
  const root = markUpdateFromFiberToRoot(fiber) as FiberRootNode
  renderRoot(root)
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

function prepareFreshStack(root: FiberRootNode) {
  // 在renderRoot 时，会创建一个workInprogress(hostRoot)
  // 也就是说，即使是mount时，hostRoot也是存在current和workinprogress
  // 所在beginwork时 也就一直走的是 reconcileChild而不是mountChild
  // 也就会标记上update， 这也是一种性能优化
  workInprogress = createWorkInProgress(root.current, {})
}

// 如何去触发该函数
// 1. React.createRoot(Element).render(app)
// 2. setState
// 3. useState 的 dispatch
// 使用Update代表更新机制， 消费update的数据结构updatequeue
function renderRoot(rootFiber: FiberRootNode) {
  prepareFreshStack(rootFiber)
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
    root.current = finishedWork
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
  const next = beginWork(fiber)
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