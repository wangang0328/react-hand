import { Placement, ChildDeletion } from './ReactFiberFlags';
import { HostText } from './ReactWorkTags';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { IReactElement, Props } from 'shared/ReactTypes'
import { createFiberFromElement, createWorkInProgress, FiberNode } from './ReactFiber'

function ChildReconciler(shouldTrackEffects: boolean) {
  // shouldTrackEffects 针对mount时的一种优化，不用一直做插入操作，只需要在根节点做一次插入操作就行

  function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
    if (!shouldTrackEffects) {
      return
    }
    if (returnFiber.deletions === null) {
      returnFiber.deletions = [childToDelete]
      returnFiber.flags |= ChildDeletion
    } else {
      returnFiber.deletions.push(childToDelete)
    }
  }

  function placeSingleChild(wip: FiberNode) {
    if (shouldTrackEffects && wip.alternate === null) {
      wip.flags |= Placement
    }
    return wip
  }

  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild: IReactElement
  ) {
    if (currentFiber !== null) {
      // update情况
      // 先判断key， 再判断type， key和type都相等时，才update，
      // TODO: 标记剩余节点删除
      if (currentFiber.key === newChild.key) {
        if (currentFiber.type === newChild.type) {
          // 都相等，复用老节点
          const existing = useFiber(currentFiber, newChild.props)
          existing.return = returnFiber
          return existing
        }
        // type 不相等情况 标记删除
        deleteChild(returnFiber, currentFiber)
      } else {
        deleteChild(returnFiber, currentFiber)
      }
    }

    const newFiber = createFiberFromElement(newChild)
    returnFiber.child = newFiber
    newFiber.return = returnFiber
    return newFiber
  }

  function reconcileSingleTextNode(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    content: string | number
  ) {
    if (currentFiber !== null) {
      // update
      if (currentFiber.tag === HostText) {
        const existing = useFiber(currentFiber, { content })
        existing.return = returnFiber
        return existing
      }
      deleteChild(returnFiber, currentFiber)
    }
    const newFiber = new FiberNode(HostText, { content }, null)
    returnFiber.child = newFiber
    newFiber.return = returnFiber
    return newFiber
  }

  return function reconcileChildFibers(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild?: IReactElement
  ) {

    if (typeof newChild === 'object' && newChild !== null) {
      switch (newChild?.$$typeof) {
        case REACT_ELEMENT_TYPE:
          return placeSingleChild(reconcileSingleElement(returnFiber, currentFiber, newChild))
        default:
          if (__DEV__) {
            console.warn('暂未实现$$typeof', newChild.$$typeof)
          }
          return null
      }
    }

    if (typeof newChild === 'string' || typeof newChild === 'number') {
      return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFiber, newChild))
    }
    if (currentFiber !== null) {
      deleteChild(returnFiber, currentFiber)
    }

    // if (Array.isArray(newChild)) {
    //   console.warn('暂未实现多节点的diff reconcile', newChild)
    //   return null
    // }
    console.warn('暂未实现多节点的diff reconcile', newChild)
    return null
  }
}

function useFiber(currentFiber: FiberNode, pendingProps: Props) {
  const clone = createWorkInProgress(currentFiber, pendingProps)
  clone.index = 0
  clone.sibling = null
  return clone
}

export const mountChildFibers = ChildReconciler(false)
export const reconcileChildFibers = ChildReconciler(true)