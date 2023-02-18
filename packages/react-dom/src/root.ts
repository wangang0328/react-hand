import { createContainer, updateContainer } from 'react-reconciler/src/ReactFiberReconciler'
import { IReactElement } from 'shared/ReactTypes'
import { Container } from './hostConfig'
// ReactDOM.createRoot(root).render()

export const createRoot = (container: Container) => {
  const root = createContainer(container)
  return {
    render: (ele: IReactElement) => {
      return updateContainer(ele, root)
    }
  }
}
