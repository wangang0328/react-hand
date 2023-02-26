import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import replace from '@rollup/plugin-replace'
import path from 'path'

import { resolveSourcePkgPath } from '../rollup/utils'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react(),
		replace({
			__DEV__: true,
			preventAssignment: true,
		}),
	],
	resolve: {
		alias: [
			{
				find: 'react',
				replacement: resolveSourcePkgPath('react'),
			},
			{
				find: 'react-dom',
				replacement: resolveSourcePkgPath('react-dom'),
			},
			{
				find: 'hostConfig',
				replacement: path.resolve(
					resolveSourcePkgPath('react-dom'),
					'./src/hostConfig.ts'
				),
			},
		],
	},
})
