import generatePackageJson from 'rollup-plugin-generate-package-json'
import alias from '@rollup/plugin-alias'
import {
	resolveSourcePkgPath,
	resolveDistPkgPath,
	getPackageJSON,
	getBaseConfig,
} from './utils'

const { module, name, peerDependencies } = getPackageJSON('react-dom')
const sourcePkgPath = resolveSourcePkgPath(name)
const distPkgPath = resolveDistPkgPath(name)

export default [
	{
		input: `${sourcePkgPath}/${module}`,
		output: [
			{
				name: 'ReactDom',
				file: `${distPkgPath}/index.js`,
				format: 'umd',
			},
			{
				name: 'ReactDom',
				file: `${distPkgPath}/client/index.js`,
				format: 'umd',
			},
		],
		external: [...Object.keys(peerDependencies)],
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
