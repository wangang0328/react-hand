export type ElementType = any
export type Key = any
export type Props = any
export type Ref = any
export type Type = any

export interface IReactElement {
  type: ElementType
  $$typeof: symbol | number
  key: Key
  ref: Ref
  props: Props
  __auth_owner: string
}
