import { Container, appendChildToContainer } from 'hostConfig'
import { HostComponent, HostRoot, HostText } from './ReactWorkTags'
import { MutationMask, NoFlags, Placement } from './ReactFiberFlags'
import { FiberNode } from './ReactFiber'

let nextEffect: FiberNode | null = null
export const commitMutationEffects = (finishedWork: FiberNode) => {
  nextEffect = finishedWork
  // 向下查找subtreeFlags & mutationMask !== NoFlags
  while (nextEffect !== null) {
    const child = nextEffect.child
    if ((nextEffect.subtreeFlags & MutationMask) !== NoFlags && child !== null) {
      // 继续向下遍历
      nextEffect = nextEffect.child
    } else {
      up: while (nextEffect !== null) {
        // FIXME: 此时该fiber节点一定有flags吗？
        commitMutationEffectsOnFiber(nextEffect)
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

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
  // Placement
  if ((finishedWork.flags & Placement) !== NoFlags) {
    commitPlacement(finishedWork)
    finishedWork.flags &= ~Placement
  }
  // Update
  // ChildDeletion
}

const commitPlacement = (finishedWork: FiberNode) => {
  if (__DEV__) {
    console.warn('placement操作', finishedWork)
  }
  // 找到父节点的dom
  const hostParent = getHostParent(finishedWork)
  // 插入节点，那么要找到对应的dom
  if (hostParent !== null) {
    appendPlacementNodeIntoContainer(finishedWork, hostParent)
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

const appendPlacementNodeIntoContainer = (
  finishedWork: FiberNode,
  hostParent: Container
) => {
  if (finishedWork.tag === HostComponent || finishedWork.tag === HostText) {
    // TODO: 做一个插入操作
    appendChildToContainer(hostParent, finishedWork.stateNode)
    return
  }

  const child = finishedWork.child

  if (child !== null) {
    appendPlacementNodeIntoContainer(child, hostParent)
    let sibling = child.sibling
    while (sibling !== null) {
      appendPlacementNodeIntoContainer(sibling, hostParent)
      sibling = sibling.sibling
    }
  }


}


