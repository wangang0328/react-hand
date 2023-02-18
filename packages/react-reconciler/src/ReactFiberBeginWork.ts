import { IReactElement } from 'shared/ReactTypes';
import { processUpdateQueue, UpdateQueue } from './updateQueue';
import { HostRoot, HostComponent, HostText } from './ReactWorkTags';
import { FiberNode } from './ReactFiber'
import { mountChildFibers, reconcileChildFibers } from './childFibers';

/**
 * 标记2类 与结构变化相关的flags
 * 1. Placement
 * 插入：a-> ab  移动：abc -> bca
 * 2. ChildDelation
 * 删除： ul>li*3 -> ul>li*1
 * 不包含与属性变化相关的flags
 */
export function beginWork(wip: FiberNode) {
  // 根据不同的类型做不同的处理
  switch (wip.tag) {
    case HostRoot:
      return updateHostRoot(wip)
    case HostComponent:
      return updateHostComponent(wip)
    case HostText:
      return null
    default:
      if (__DEV__) {
        console.warn('begin未实现的类型', wip.tag)
      }
      break;
  }
  return null
}

function updateHostRoot(wip: FiberNode) {
  // 计算state
  const baseState = wip.memoizedState
  const updateQueue = wip.updateQueue as UpdateQueue<Element>
  const pending = updateQueue.shared.pending
  // 已经计算完毕，重置pending
  updateQueue.shared.pending = null
  const { memoizedState } = processUpdateQueue(baseState, pending)
  const nextChildren = wip.memoizedState = memoizedState

  // 创造子fiberNode
  reconcilerChildren(wip, nextChildren)
  return wip.child
}

function updateHostComponent(wip: FiberNode) {
  // HostComponent 不能触发更新，所以只做一件事：创造子fiber
  // <div><span/></div>, div 生成 span fiber， div的props的children 是span的ReactElement信息
  // div的props 对应着 wip的 pendingProps
  const nextChildren = wip.pendingProps.children
  reconcilerChildren(wip, nextChildren)
  return wip.child
}


function reconcilerChildren(wip: FiberNode, nextChild?: IReactElement) {
  const current = wip.alternate
  if (current !== null) {
    wip.child = reconcileChildFibers(wip, current?.child, nextChild)
  } else {
    wip.child = mountChildFibers(wip, null, nextChild)
  }
}

