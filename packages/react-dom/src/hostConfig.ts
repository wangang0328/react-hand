export type Container = Element
export type Instance = Element

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