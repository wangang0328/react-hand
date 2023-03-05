// @ts-nocheck
import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

const Child = () => <div>child</div>
const App = () => {
	const [num, setNum] = useState(3)
	window.setNum = setNum
	return <div>{num === 100 ? <span>{num}</span> : <Child />}</div>
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
