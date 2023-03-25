// @ts-nocheck
import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'

// const Child = () => <div>child</div>

const Child = () => {
	useEffect(() => {
		console.log('child mount')
		return () => console.log('child UnMount')
	}, [])
	return <div>child</div>
}
const App = () => {
	const [num, setNum] = useState(0)
	window.setNum = setNum
	useEffect(() => {
		console.log('app mount')
		return () => console.log('app unmount')
	}, [])

	useEffect(() => {
		console.log('app update')
		return () => console.log('app destory')
	}, [num])
	// const arr =
	// 	num % 2 !== 0
	// 		? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
	// 		: [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>]

	// return (
	// 	<ul onClick={() => setNum(num + 1)}>
	// 		<li key="4">4</li>
	// 		<li key="5">5</li>
	// 		{arr}
	// 	</ul>
	// )
	return (
		<div
			onClick={() => {
				setNum((num) => num + 1)
				// setNum((num) => num + 1)
				// setNum((num) => num + 1)
			}}
		>
			<span>{num}</span>
			{num === 0 ? <Child /> : 'null'}
		</div>
	)
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
