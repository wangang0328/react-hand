import { IReactElement } from './../../shared/ReactTypes';
import { Container } from 'hostConfig'
import { HostRoot } from './ReactWorkTags'
import { scheduleUpdateOnFiber } from './ReactFiberWorkLoop'
import { FiberNode, FiberRootNode } from './ReactFiber'
import { createUpdateQueue, createUpdate, enqueueUpdate, UpdateQueue } from './updateQueue'
// ReactDom.createRoot(element).render(<App />)

// fiberRootNode ==current==> hostRootFiber ==child==> App
// App ==return==> hostRootFiber ==stateNode==> fiberRootNode

// createRoot会调用该方法
export const createContainer = (container: Container) => {
  // 创建hostRoot
  const hostRootFiber = new FiberNode(HostRoot, {}, null)
  // 创建fiberRootNode
  const root = new FiberRootNode(container, hostRootFiber)
  // 创建updateQueue
  hostRootFiber.updateQueue = createUpdateQueue()
  return root
}

// render 会调用该方法
export const updateContainer = (
  element: IReactElement,
  root: FiberRootNode
) => {
  const hostRootFiber = root.current
  // App 的ReactElement
  const update = createUpdate<IReactElement | null>(element)
  enqueueUpdate(
    hostRootFiber.updateQueue as UpdateQueue<IReactElement | null>,
    update
  )
  // 调度 schedule
  scheduleUpdateOnFiber(hostRootFiber)
  return element
}