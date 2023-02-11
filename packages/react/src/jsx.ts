import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols'
import { ElementType, Key, Ref, Props, IReactElement, Type } from 'shared/ReactTypes'
import hasOwnProperty from 'shared/hasOwnPropety'

const ReactElement = (type: Type, key: Key, ref: Ref, props: Props) => {
  const element: IReactElement = {
    $$typeof: REACT_ELEMENT_TYPE,
    type,
    key,
    ref,
    props,
    __auth_owner: 'wa'
  }
  return element
}

export const jsx = (type: ElementType, config: any, maybeKey: any, ...rest: any[]) => {
  let key: Key | null = null
  let ref: Ref | null = null
  const props: Props = {}
  if (maybeKey !== undefined) {
    key = maybeKey + ''
  }
  for (const prop in config) {
    const val = config[prop]

    if (prop === 'ref') {
      if (val !== undefined) {
        key = val + ''
      }
      continue
    }

    if (prop === 'ref') {
      if (val !== undefined) {
        ref = val
      }
      continue
    }

    if (hasOwnProperty.call(config, prop)) {
      props[prop] = val
    }
  }

  const childrenLength = rest.length
  if (childrenLength) {
    if (childrenLength === 1) {
      props.children = rest[0]
    } else {
      props.children = rest
    }
  }

  return ReactElement(type, key, ref, props)
}

export const jsxDEV = jsx