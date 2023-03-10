import { createContainer, updateContainer } from 'react-reconciler/src/ReactFiberReconciler'
import { IReactElement } from 'shared/ReactTypes'
import { Container } from './hostConfig'
import { initEvent } from './SyntheticEvent'
// ReactDOM.createRoot(root).render()

export const createRoot = (container: Container) => {
  const root = createContainer(container)
  return {
    render: (ele: IReactElement) => {
      initEvent(container, 'click')
      return updateContainer(ele, root)
    }
  }
}
