import { NoFlags } from './ReactFiberFlags';
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { HostComponent, HostText, HostRoot, FunctionComponent } from './ReactWorkTags'
import { FiberNode } from './ReactFiber'
import { createInstance, appendInitialChild, Container, createTextInstance } from 'hostConfig'

export const completeWork = (wip: FiberNode) => {
  // 对比props 标记update
  // 收集 subtreeFlags
  // 构建dom
  const current = wip.alternate
  const newProps = wip.pendingProps

  switch (wip.tag) {
    case HostComponent:
      if (current !== null && wip.stateNode) {
        // update
      } else {
        // 构建dom
        const instance = createInstance(wip.type, newProps)
        // 插入到dom树中
        appendAllChild(instance, wip)
        wip.stateNode = instance
      }
      bubbleProperties(wip)
      return null
    case HostText:
      if (current !== null && wip.stateNode) {
        // update
      } else {
        // 构建dom
        const instance = createTextInstance(newProps.content)
        wip.stateNode = instance
      }
      bubbleProperties(wip)
      return null
    case HostRoot:
      bubbleProperties(wip)
      return null
    case FunctionComponent:
      bubbleProperties(wip)
      return null
    default:
      if (__DEV__) {
        console.warn('completeWork 未处理节点类型', wip)
      }
      break;
  }
}


function appendAllChild(parentNode: Container, wip: FiberNode) {
  let curNode = wip.child

  // 深度优先遍历
  while (curNode !== null) {
    if (curNode.tag === HostComponent || curNode.tag === HostText) {
      appendInitialChild(parentNode, curNode.stateNode)
    } else if (curNode.child !== null) {
      curNode.child.return = curNode
      curNode = curNode.child
      continue
    }

    if (curNode === wip) {
      return
    }

    while (curNode!.sibling === null) {
      curNode = curNode!.return
      if (curNode === wip || curNode?.return === null) {
        return
      }
      curNode = curNode!.return
    }

    curNode!.sibling.return = curNode!.return
    curNode = curNode!.sibling
  }
}

function bubbleProperties(wip: FiberNode) {
  let subtreeFlags = NoFlags
  let curNode = wip.child
  while (curNode !== null) {
    subtreeFlags |= curNode.flags
    subtreeFlags |= curNode.subtreeFlags
    curNode.return = wip
    curNode = curNode.sibling
  }
  wip.subtreeFlags = subtreeFlags
}