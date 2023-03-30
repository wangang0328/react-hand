import generatePackageJson from 'rollup-plugin-generate-package-json'
import {
	resolveSourcePkgPath,
	resolveDistPkgPath,
	getPackageJSON,
	getBaseConfig,
} from './utils'

const { module, name } = getPackageJSON('scheduler')
const sourcePkgPath = resolveSourcePkgPath(name)
const distPkgPath = resolveDistPkgPath(name)

export default [
	{
		input: `${sourcePkgPath}/${module}`,
		output: {
			name: 'scheduler',
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
]
