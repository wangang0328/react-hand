import generatePackageJson from 'rollup-plugin-generate-package-json'
import {
	resolveSourcePkgPath,
	resolveDistPkgPath,
	getPackageJSON,
	getBaseConfig,
} from './utils'

const { module, name } = getPackageJSON('react')
const sourcePkgPath = resolveSourcePkgPath(name)
const distPkgPath = resolveDistPkgPath(name)

export default [
	{
		input: `${sourcePkgPath}/${module}`,
		output: {
			name: 'react',
			file: `${distPkgPath}/index.js`,
			format: 'umd',
		},
		plugins: [
			...getBaseConfig(),
			generatePackageJson({
				inputFolder: sourcePkgPath,
				outputFolder: distPkgPath,
				baseContents: ({ name, description, version }) => ({
					name,
					version,
					description,
					main: 'index.js',
				}),
			}),
		],
	},
	{
		input: `${sourcePkgPath}/src/jsx.ts`,
		output: [
			{
				file: `${distPkgPath}/jsx-runtime.js`,
				name: 'jsx-runtime',
				format: 'umd',
			},
			{
				file: `${distPkgPath}/jsx-dev-runtime.js`,
				name: 'jsx-dev-runtime',
				format: 'umd',
			},
		],
		plugins: getBaseConfig(),
	},
]
