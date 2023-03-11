const supportSymbol = (typeof Symbol !== 'undefined') && Symbol.for

export const REACT_ELEMENT_TYPE = supportSymbol ? Symbol.for('react.element') : 0xeac7

export const REACT_FRAGMENT_TYPE = supportSymbol ? Symbol.for('react.fragment') : 0xeacb