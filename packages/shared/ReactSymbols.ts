const supportSymbol = (typeof Symbol !== 'undefined') && Symbol.for

export const REACT_ELEMENT_TYPE = supportSymbol ? Symbol.for('react.element') : 0xeac7
