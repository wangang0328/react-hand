import { Placement, ChildDeletion } from './ReactFiberFlags';
import { HostText } from './ReactWorkTags';
import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { IReactElement, Props } from 'shared/ReactTypes'
import { createFiberFromElement, createWorkInProgress, FiberNode } from './ReactFiber'

type ExistingChildren = Map<string | number, FiberNode>

function ChildReconciler(shouldTrackEffects: boolean) {
  // shouldTrackEffects 针对mount时的一种优化，不用一直做插入操作，只需要在根节点做一次插入操作就行
  function deleteRemainingChildren(returnFiber: FiberNode, currentFirstFiber: FiberNode | null) {
    if (!shouldTrackEffects) {
      return
    }
    let childToDelete: FiberNode | null = currentFirstFiber
    while (childToDelete !== null) {
      deleteChild(returnFiber, childToDelete)
      childToDelete = childToDelete.sibling
    }
  }

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

  // 单节点diff算法， 单节点(是更新后的节点是单节点)
  // 1. key相同，type相同 可以复用节点
  // 2. key相同， type不同 后续都不可能复用节点
  // 3. key不同， type不同 当前节点不能复用
  // 4. key不同， type相同 当前节点不能复用
  function reconcileSingleElement(
    returnFiber: FiberNode,
    currentFiber: FiberNode | null,
    newChild: IReactElement
  ) {
    while (currentFiber !== null) {
      // update情况
      // 先判断key， 再判断type， key和type都相等时，才update，
      // TODO: 标记剩余节点删除
      if (currentFiber.key === newChild.key) {
        if (currentFiber.type === newChild.type) {
          // key相同，type相同 复用老节点
          const existing = useFiber(currentFiber, newChild.props)
          existing.return = returnFiber
          deleteRemainingChildren(returnFiber, currentFiber.sibling)
          return existing
        }
        // key相同 type 不相等情况 删除剩余所有
        deleteRemainingChildren(returnFiber, currentFiber)
        break
      } else {
        // key 不同
        deleteChild(returnFiber, currentFiber)
      }
      currentFiber = currentFiber.sibling
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
    while (currentFiber !== null) {
      // update
      if (currentFiber.tag === HostText) {
        const existing = useFiber(currentFiber, { content })
        existing.return = returnFiber
        deleteRemainingChildren(returnFiber, currentFiber.sibling)
        return existing
      }
      deleteChild(returnFiber, currentFiber)
      currentFiber = currentFiber.sibling
    }
    const newFiber = new FiberNode(HostText, { content }, null)
    returnFiber.child = newFiber
    newFiber.return = returnFiber
    return newFiber
  }

  function reconcileChildrenArray(
    returnFiber: FiberNode,
    currentFirstFiber: FiberNode | null,
    newChild: any[]
  ) {
    let lastPlaceIndex = 0
    let lastNewFiber: FiberNode | null = null
    let firstNewFiber: FiberNode | null = null

    // 1. 将所有的同级fiber保存到map中，方便查找
    const existingChildren: ExistingChildren = new Map()
    let fiber = currentFirstFiber
    while (fiber !== null) {
      const keyToUse = fiber.key === null ? fiber.index : fiber.key
      existingChildren.set(keyToUse, fiber)
      fiber = fiber.sibling
    }

    for (let i = 0; i < newChild.length; i++) {
      // 2. 遍历newChild数组，判断是否可复用
      const after = newChild[i]
      const newFiber = updateFiberFromMap(
        returnFiber,
        existingChildren,
        i,
        after
      )
      if (newFiber === null) {
        continue
      }
      // 3. 判断插入还是移动
      newFiber.index = i
      newFiber.return = returnFiber

      if (lastNewFiber === null) {
        firstNewFiber = newFiber
        lastNewFiber = newFiber
      } else {
        lastNewFiber.sibling = newFiber
        lastNewFiber = lastNewFiber.sibling
      }
      if (!shouldTrackEffects) {
        continue
      }

      const current = newFiber.alternate
      if (current !== null) {
        const oldIndex = current.index
        if (oldIndex < lastPlaceIndex) {
          // 移动
          newFiber.flags |= Placement
          continue
        } else {
          lastPlaceIndex = oldIndex
        }
      } else {
        // mount
        newFiber.flags |= Placement
      }
    }

    // 4. 最后将map中剩下的数据标记删除
    existingChildren.forEach((fiber) => {
      deleteChild(returnFiber, fiber)
    })

    return firstNewFiber
  }

  function updateFiberFromMap(
    returnFiber: FiberNode,
    existingFiber: ExistingChildren,
    index: number,
    element: any
  ): FiberNode | null {
    const keyToUse = element.key === null ? index : element.key
    const before = existingFiber.get(keyToUse)

    // HostText 的情况
    if (typeof element === 'string' || typeof element === 'number') {
      if (before) {
        if (before.tag === HostText) {
          existingFiber.delete(keyToUse)
          return useFiber(before, { content: element + '' })
        }
        return new FiberNode(HostText, { content: element + '' }, null)
      }
    }

    // ReactElement 情况
    if (typeof element === 'object' && element !== null) {
      switch (element.$$typeof) {
        case REACT_ELEMENT_TYPE:
          if (before) {
            if (element.type === before.type) {
              existingFiber.delete(keyToUse)
              return useFiber(before, element.props)
            }
          }
          return createFiberFromElement(element)
        default:
          if (__DEV__) {
            console.warn('暂未实现diff类型')
          }
          break
      }

      if (Array.isArray(element) && __DEV__) {
        console.warn('暂未实现数组diff类型')
      }
    }
    return null
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
      }
      if (Array.isArray(newChild)) {
        return reconcileChildrenArray(returnFiber, currentFiber, newChild)
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