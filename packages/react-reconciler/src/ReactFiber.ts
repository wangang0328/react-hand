import { IReactElement, Key, Props, Ref } from 'shared/ReactTypes';
import { Flags, NoFlags } from './ReactFiberFlags'
import { WorkTag, FunctionComponent, HostComponent } from "./ReactWorkTags"
import { Container } from 'hostConfig'

export class FiberNode {
  tag: WorkTag
  key: Key
  stateNode: any
  type: any

  return: FiberNode | null
  sibling: FiberNode | null
  child: FiberNode | null
  index: number

  ref: Ref | null

  flags: Flags
  subtreeFlags: Flags
  pendingProps: Props | null
  memoizedProps: Props | null
  memoizedState: any
  updateQueue: unknown
  alternate: FiberNode | null

  constructor(tag: WorkTag, pendingProps: Props, key: Key) {
    // instance
    this.tag = tag
    this.key = key
    // HostComponent 指向dom实例
    this.stateNode = null
    // FunctionComponent 该方法() => {}
    this.type = null

    // fiber 关系
    this.return = null
    this.sibling = null
    this.child = null
    this.index = 0

    this.ref = null

    // 副作用
    this.flags = NoFlags
    this.subtreeFlags = NoFlags

    // 工作单元
    this.pendingProps = pendingProps
    this.memoizedProps = null
    this.memoizedState = null
    this.updateQueue = null

    this.alternate = null
  }
}

export class FiberRootNode {
  current: FiberNode
  // ReactDom.createRoot(ele)的dom参数
  container: Container
  // 经过workloop已经完成的fiber树
  finishedWork: null | FiberNode

  constructor(container: Container, hostRootFiber: FiberNode) {
    this.container = container
    this.current = hostRootFiber
    hostRootFiber.stateNode = this
    this.finishedWork = null
  }
}


export const createWorkInProgress = (current: FiberNode, pendingProps: Props): FiberNode => {
  let wip = current.alternate

  if (wip === null) {
    wip = new FiberNode(current.tag, pendingProps, current.key)
    wip.stateNode = current.stateNode

    wip.alternate = current
    current.alternate = wip
  } else {
    wip.flags = NoFlags
    wip.subtreeFlags = NoFlags
    wip.pendingProps = pendingProps
  }
  wip.updateQueue = current.updateQueue
  wip.type = current.type
  wip.child = current.child
  wip.memoizedProps = current.memoizedProps
  wip.memoizedState = current.memoizedState

  return wip
}

export const createFiberFromElement = (element: IReactElement) => {
  const { type, key, props } = element
  let fiberTag: WorkTag = FunctionComponent

  if (typeof element.type === 'string') {
    fiberTag = HostComponent
  } else if (typeof type !== 'function' && __DEV__) {
    console.warn('未定义的type类型：', type)
  }
  const fiber = new FiberNode(fiberTag, props, key)
  fiber.type = type
  return fiber
}