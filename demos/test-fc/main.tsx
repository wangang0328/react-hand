// @ts-nocheck
import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

// const Child = () => <div>child</div>
const App = () => {
	const [num, setNum] = useState(3)
	window.setNum = setNum
	const arr =
		num % 2 !== 0
			? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
			: [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>]

	return (
		<ul onClick={() => setNum(num + 1)}>
			<li key="4">4</li>
			<li key="5">5</li>
			{arr}
		</ul>
	)
	// return (
	// 	<div onClick={() => setNum(num + 1)}>
	// 		<span>{num}</span>
	// 	</div>
	// )
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
