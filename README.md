# 知识回顾

## React 包

处理 react 的一些公用方法

## 创建 jsx 函数

### jsx 通过 babel 解析编译成 jsxruntime 或者 createElement

在 react17 之前使用的都是 classic 模式， 17 及之后使用的是 automatic

```jsx
<span calssName="wrap" key="1">
	aa
</span>
```

classic 模式：

```javascript
React.createElement(
	'span',
	{
		className: 'wrap',
		key: '1',
	},
	'aa'
)
```

automatic 模式：

```javascript
var _jsxRuntime = require('react/jsx-runtime')(0, _jsxRntime.jsx)(
	'span',
	{
		className: 'wrap',
		children: 1,
	},
	'1'
)
```

由上也就知道了为什么 react17 之前会要求手动引入 React，而之后不用

### jsx 函数的处理

创建 ReactElement

```javascript
function ReactElement(type, key, ref, props) {
	const element = {
		$$typeof: Symbol.for('react.element'),
		type,
		key,
		ref,
		props,
	}
	return element
}
```

此时已经有 ReactElement 了，根据 React 初始化的方向

## react-reconciler

react 包的核心模块，react 的协调器

### reconciler 有什么用：

jquery 是过程驱动，而前端的框架是状态驱动

- 消费 jsx
- 没有编译优化
- 开放通过 api 提供不同宿主环境使用

### 核心模块消费 jsx 的过程

ReactElement 存在的问题：

1. 无法表达节点之间的关系
2. 字段有限， 不好扩展（比如：无法表达状态）
   所以就来了 Fiber 结构

- 介于 ReactElement 与真实 UI 之间
- 能够表达节点之间的关系
- 方便扩展(不仅能够作为数据存储单元，也能够作为工作单元)

### reconciler 的工作方式：

对于同一个节点，比较 React Element 与 react fiberNode 生成子 fiberNode，并根据比较的结果生成不同的标记(插入、删除、更新等)， 对应不同宿主环境 API 的执行

### 消费 jsx

深度优先遍历 ReactElement

1. 如果有子节点，遍历子节点
2. 如果没有子节点遍历兄弟节点

所以遍历的过程存在两个阶段向下探寻(beginWork)，向上回溯(completeWork)
一些主流程及处理思路

- `renderRoot(root: FiberRootNode)`
  -- 调用 `prepareFreshStack(root)`
  ---- 调用 `createWorkInProgress`
  ---- 创建 workInProgress fiber, root.current.alternate = workInProgress
  -- 调用 循环调用 `workLoop`函数
  ---- 调用 `performUnitOfWork`
  ------ 调用 `beginWork`
  --------- 根据不同的 tag 调用不同的函数
  --------- diff 算法， 计算状态，打上与结构相关的 flags 如：Placement ChildDeletion
  ------ 调用 `completeWork`
  -------- 同样的 根据不同的 tag 调用不同的函数
  -------- 打上与属性相关的变化的 flags，收集 subFlags， 构建 dom

此时已经构建了一个完成的 fiber 树
将 fiber 树挂到 fiberRootNode 的 finishedWork 属性上
提交 commitRoot, 进入 commit 阶段

### commit 阶段

commit 阶段分为 3 个子阶段

beforMutation 阶段 - commitBeforeMutationEffects
mutation 阶段 - commitMutationEffects
layout 阶段 - commitLayoutEffects
