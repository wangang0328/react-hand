import generatePackageJson from 'rollup-plugin-generate-package-json'
import alias from '@rollup/plugin-alias'
import {
	resolveSourcePkgPath,
	resolveDistPkgPath,
	getPackageJSON,
	getBaseConfig,
} from './utils'

const { module, name } = getPackageJSON('react-dom')
const sourcePkgPath = resolveSourcePkgPath(name)
const distPkgPath = resolveDistPkgPath(name)

export default [
	{
		input: `${sourcePkgPath}/${module}`,
		output: [
			{
				name: 'index.js',
				file: `${distPkgPath}/index.js`,
				format: 'umd',
			},
			{
				name: 'index.js',
				file: `${distPkgPath}/client/index.js`,
				format: 'umd',
			},
		],
		plugins: [
			...getBaseConfig(),
			alias({
				entries: {
					hostConfig: `${sourcePkgPath}/src/hostConfig.ts`,
				},
			}),
			generatePackageJson({
				inputFolder: sourcePkgPath,
				outputFolder: distPkgPath,
				baseContents: ({ name, description, version }) => ({
					name,
					version,
					description,
					main: 'index.js',
					peerDependencies: {
						react: version,
					},
				}),
			}),
		],
	},
]
