import { removeChild, Instance, insertChildToContainer } from './../../react-dom/src/hostConfig';
import { Container, appendChildToContainer, commitUpdate } from 'hostConfig'
import { FunctionComponent, HostComponent, HostRoot, HostText } from './ReactWorkTags'
import { ChildDeletion, MutationMask, NoFlags, Placement, Update } from './ReactFiberFlags'
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
  if ((finishedWork.flags & Update) !== NoFlags) {
    commitUpdate(finishedWork)
    finishedWork.flags &= ~Update
  }

  // ChildDeletion
  if ((finishedWork.flags & ChildDeletion) !== NoFlags) {
    const deletions = finishedWork.deletions
    if (deletions !== null) {
      deletions.forEach((childToDelete) => {
        commitDeletion(childToDelete)
      })
    }
    finishedWork.flags &= ~ChildDeletion
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

const commitDeletion = (childToDelete: FiberNode) => {
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
        // TODO: 处理useEffect等
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


