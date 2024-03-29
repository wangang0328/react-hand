import { removeChild, Instance, insertChildToContainer } from './../../react-dom/src/hostConfig';
import { Container, appendChildToContainer, commitUpdate } from 'hostConfig'
import { FunctionComponent, HostComponent, HostRoot, HostText } from './ReactWorkTags'
import { ChildDeletion, Flags, MutationMask, NoFlags, PassiveEffect, Placement, Update } from './ReactFiberFlags'
import { FiberNode, FiberRootNode, PendingPassiveEffects } from './ReactFiber'
import { FnUpdateQueue, Effect } from './fiberHooks';
import { HookHasEffect } from './hookEffectTags';

let nextEffect: FiberNode | null = null
export const commitMutationEffects = (finishedWork: FiberNode, root: FiberRootNode) => {
  nextEffect = finishedWork
  // 向下查找subtreeFlags & mutationMask !== NoFlags
  while (nextEffect !== null) {
    const child = nextEffect.child
    if ((nextEffect.subtreeFlags & (MutationMask | PassiveEffect)) !== NoFlags && child !== null) {
      // 继续向下遍历
      nextEffect = nextEffect.child
    } else {
      up: while (nextEffect !== null) {
        // FIXME: 此时该fiber节点一定有flags吗？
        commitMutationEffectsOnFiber(nextEffect, root)
        const sibling = nextEffect.sibling
        if (sibling !== null) {
          nextEffect = sibling
          break up
        }
        nextEffect = nextEffect.return
      }
    }
  }
}

const commitMutationEffectsOnFiber = (finishedWork: FiberNode, root: FiberRootNode) => {
  // Placement
  if ((finishedWork.flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork)
    finishedWork.flags &= ~Placement
  }

  // Update
  if ((finishedWork.flags & Update) !== NoFlags) {
    commitUpdate(finishedWork)
    finishedWork.flags &= ~Update
  }

  // ChildDeletion
  if ((finishedWork.flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions
    if (deletions !== null) {
      deletions.forEach((childToDelete) => {
        commitDeletion(childToDelete, root)
      })
    }
    finishedWork.flags &= ~ChildDeletion
  }

  // PassiveEffect
  if ((finishedWork.flags & PassiveEffect) !== NoFlags) {
    // 收集回调
    commitPassiveEffect(root, finishedWork, 'update')
    // 删除掉 PassiveEffect
    finishedWork.flags &= ~PassiveEffect
  }
}

// 收集副作用
function commitPassiveEffect(
  root: FiberRootNode,
  fiber: FiberNode,
  type: keyof PendingPassiveEffects
) {
  if (fiber.tag !== FunctionComponent || (type === 'update' && (fiber.flags & PassiveEffect) === NoFlags)) {
    return
  }
  const updateQueue = fiber.updateQueue as FnUpdateQueue<any>
  if (updateQueue !== null) {
    if (updateQueue.lastEffect === null && __DEV__) {
      console.error('不应该走此逻辑，updateQueue不为空，但是lastEffect也不应该为空')
    }
    root.pendingPassiveEffects[type].push(updateQueue.lastEffect as Effect)
  }
}

function recordHostChildrenToDelete(
  childrenToDelete: FiberNode[],
  unmountFiber: FiberNode
) {
  const lastOne = childrenToDelete[childrenToDelete.length - 1]
  // 找到第一个root host 节点
  if (!lastOne) {
    childrenToDelete.push(unmountFiber)
  } else {// 每找到一个hostRoot节点就判断一下是不是 1 的兄弟节点，如果是，push进去
    let fiber: FiberNode | null = lastOne
    while (fiber !== null) {
      if (fiber === unmountFiber) {
        childrenToDelete.push(lastOne)
        break
      }
      fiber = fiber.sibling
    }
  }

}

const commitDeletion = (childToDelete: FiberNode, root: FiberRootNode) => {
  // FunctionComponent 执行useEffect unmount, 解绑ref
  // HostComponent 解绑 Ref
  // 对于子树的 HostRootComponent/HostRootText 需要移除
  const rootChildToDelete: FiberNode[] = []
  commitNestedComponent(childToDelete, (fiber) => {
    switch (fiber.tag) {
      case HostComponent:
        // 解绑ref， 打上标记
        recordHostChildrenToDelete(rootChildToDelete, fiber)
        break
      case HostText:
        recordHostChildrenToDelete(rootChildToDelete, fiber)
        break
      case FunctionComponent:
        // TODO: 解绑ref
        commitPassiveEffect(root, childToDelete, 'unmount')
        break;
      default:
        if (__DEV__) {
          console.warn('暂未实现的deletion')
        }
        break;
    }
  })
  if (rootChildToDelete.length) {
    const hostParent = getHostParent(childToDelete)
    if (hostParent !== null) {
      rootChildToDelete.forEach(childToDelete => {
        removeChild(hostParent, childToDelete.stateNode)
      })
    }
  }
}

// 深度优先遍历
const commitNestedComponent = (
  root: FiberNode,
  onCommitUnMount: (fiber: FiberNode) => void
) => {
  let node = root

  while (true) {
    onCommitUnMount(node)
    if (node.child !== null) {
      node.child.return = node
      node = node.child
      continue
    }

    if (root === node) {
      return
    }

    // 向上遍历
    while (node.sibling === null) {
      if (node.return === null || node === root) {
        return
      }
      node = node.return
    }
    node.sibling.return = node.return
    node = node.sibling
  }
}

const commitPlacement = (finishedWork: FiberNode) => {
  if (__DEV__) {
    console.warn('placement操作', finishedWork)
  }
  // 找到父节点的dom
  const hostParent = getHostParent(finishedWork)

  // host sibling
  // TODO: 完成插入操作
  const hostSibling = getHostSibling(finishedWork)

  // 插入节点，那么要找到对应的dom
  if (hostParent !== null) {
    insertOrAppendPlacementNodeIntoContainer(finishedWork, hostParent, hostSibling)
  }
}

// 查找hostsibling
const getHostSibling = (fiber: FiberNode) => {
  let node = fiber

  findSibling: while (true) {
    while (node.sibling === null) {
      // 同级没有sibling节点，向上查找
      const parent = node.return
      if (parent === null || parent.tag === HostComponent || parent.tag === HostText) {
        return null
      }
      node = parent
    }
    node.sibling.return = node.return
    node = node.sibling

    while (node.tag !== HostText && node.tag !== HostComponent) {
      if ((node.flags & Placement) !== NoFlags) {
        continue findSibling
      }
      if (node.child === null) {
        // 找到最底部了
        continue findSibling
      } else {
        // 继续向下遍历
        node.child.return = node
        node = node.child
      }
    }

    // 找到了hosttext 或者 hostcomponent
    if ((node.flags & Placement) === NoFlags) {
      return node.stateNode
    }
  }

}

const getHostParent = (fiber: FiberNode) => {
  let parent = fiber.return
  while (parent !== null) {
    if (parent.tag === HostComponent) {
      return parent.stateNode as Container
    }
    if (parent.tag === HostRoot) {
      return parent.stateNode.container as Container
    }
    parent = parent.return
  }
  if (__DEV__) {
    console.warn('未找到hostParent');
  }
  return null
}

const insertOrAppendPlacementNodeIntoContainer = (
  finishedWork: FiberNode,
  hostParent: Container,
  before?: Instance,
) => {
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    if (before) {
      insertChildToContainer(hostParent, finishedWork.stateNode, before)
    } else {
      appendChildToContainer(hostParent, finishedWork.stateNode)
    }
    return
  }

  const child = finishedWork.child

  if (child !== null) {
    insertOrAppendPlacementNodeIntoContainer(child, hostParent, before)
    let sibling = child.sibling
    while (sibling !== null) {
      insertOrAppendPlacementNodeIntoContainer(sibling, hostParent, before)
      sibling = sibling.sibling
    }
  }
}

/**
 * 初始时
 * @param flags 当前执行的effect类型，Passive， Lyout， 其实这里也算是执行的条件
 * @param lastEffect
 * @param callback
 */
function commitHookEffectList(flags: Flags, lastEffect: Effect, callback: (effect: Effect) => void) {
  // 第一个effect
  let effect = lastEffect.next as Effect
  do {
    if ((effect.tag & flags) === flags) {
      // 不是该类型的effect，不去执行
      callback(effect)
    }
    effect = effect.next as Effect
  } while (effect !== lastEffect.next)
}

/**
 * 组件卸载时的情况 执行destory
 * @param flags
 * @param lastEffect
 */
export function commitHookEffectListUnmount(flags: Flags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, effect => {
    const destory = effect.destory
    if (typeof destory === 'function') {
      destory()
    }
    // 该组件要销毁了，后续就不需要执行create方法了
    effect.tag &= ~HookHasEffect
  })
}

/**
 * 更新执行 destory
 * @param flags
 * @param lastEffect
 */
export function commitHookEffectLisDestory(flags: Flags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, effect => {
    const destory = effect.destory
    if (typeof destory === 'function') {
      destory()
    }
  })
}

export function commitHookEffectLisCreate(flags: Flags, lastEffect: Effect) {
  commitHookEffectList(flags, lastEffect, effect => {
    const create = effect.create
    if (typeof create === 'function') {
      effect.destory = create()
    }
  })
}
