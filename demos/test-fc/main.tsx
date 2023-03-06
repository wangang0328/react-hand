// @ts-nocheck
import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

const Child = () => <div>child</div>
const App = () => {
	const [num, setNum] = useState(3)
	window.setNum = setNum
	return (
		<div onClick={() => setNum(num + 1)}>
			<span>{num}</span>
		</div>
	)
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
