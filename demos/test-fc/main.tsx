// @ts-nocheck
import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

// const Child = () => <div>child</div>

const doSomethingDelay = (time: number) => {
	const currentTime = performance.now()
	while (performance.now() - currentTime < time) {
		// do nothing
	}
}

const Child = ({ children }) => {
	doSomethingDelay(4)
	console.log('children-', children)
	return <li>{children}</li>
}
const App = () => {
	const [num, setNum] = useState(1500)

	return (
		<ul
			onClick={() => {
				setNum(50)
			}}
		>
			{new Array(num).fill(0).map((_, index) => (
				<Child key={index}>{index}</Child>
			))}
		</ul>
	)
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
