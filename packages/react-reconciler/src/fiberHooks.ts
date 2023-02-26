import { FiberNode } from './ReactFiber';
export function renderWithHooks(wip: FiberNode) {
  const Component = wip.type
  const pendingProps = wip.pendingProps
  return Component(pendingProps)
}