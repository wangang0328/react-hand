import { Dispatcher, resolveDispatcher, currentDispatcher } from './src/currentDispatcher';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { jsxDEV } from './src/jsx'

// 其实导出的useStae的实现在react-reconcile 包
export const useState: Dispatcher['useState'] = (initialState) => {
  const dispatcher = resolveDispatcher()
  return dispatcher.useState(initialState)
}

// 内部数据共享层，其实就是将hook的实现通过该指针进行赋值
export const __SECRET_INTERANLS_DO_NOT_USE_OR_YOU_WILL_FIRED = {
  currentDispatcher
}




export default {
  createElement: jsxDEV,
  version: '1.0.0'
}