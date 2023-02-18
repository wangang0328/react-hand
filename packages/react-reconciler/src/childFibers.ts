import { Placement } from './ReactFiberFlags';
import { HostText } from './ReactWorkTags';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { IReactElement } from 'shared/ReactTypes'
import { createFiberFromElement, FiberNode } from './ReactFiber'

function ChildReconciler(shouldTrackEffects: boolean) {
  // shouldTrackEffects 针对mount时的一种优化，不用一直做插入操作，只需要在根节点做一次插入操作就行

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
    // TODO: update, 目前只做mount时
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
    // TODO: update, 目前只做mount时
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

    // if (Array.isArray(newChild)) {
    //   console.warn('暂未实现多节点的diff reconcile', newChild)
    //   return null
    // }
    console.warn('暂未实现多节点的diff reconcile', newChild)
    return null
  }
}

export const mountChildFibers = ChildReconciler(false)
export const reconcileChildFibers = ChildReconciler(true)