import { HostComponent, HostText } from 'react-reconciler/src/ReactWorkTags'
import { FiberNode } from 'react-reconciler/src/ReactFiber'
export type Container = Element
export type Instance = Element
export type TextInstance = Element

export const createInstance = (type: string, props: any): Instance => {
  const instance = document.createElement(type)
  // TODO: 实现属性赋值
  return instance
}

export const appendInitialChild = (
  parent: Container | Instance,
  child: Container
) => {
  parent.appendChild(child)
}

export const createTextInstance = (content: string) => {
  return document.createTextNode(content)
}

export const appendChildToContainer = appendInitialChild

export const commitUpdate = (fiber: FiberNode) => {
  switch (fiber.tag) {
    case HostText:
      const text = fiber.memoizedProps.content
      return commmitTextUpdate(fiber.stateNode, text)
    default:
      if (__DEV__) {
        console.warn('暂未实现的commitUpdate类型')
      }
      break
  }
}

export const removeChild = (
  parent: Instance,
  child: Instance | TextInstance
) => {
  parent.removeChild(child)
}

function commmitTextUpdate(textInstance: TextInstance, text: string) {
  textInstance.textContent = text
}