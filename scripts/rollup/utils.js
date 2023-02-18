import path from 'path'
import fs from 'fs'
import tsPlugin from 'rollup-plugin-typescript2'
import replace from '@rollup/plugin-replace'
import commonjsPlugin from '@rollup/plugin-commonjs'

export const resolveSourcePkgPath = function (name) {
	return path.resolve(__dirname, `../../packages/${name}`)
}

export const resolveDistPkgPath = function (name) {
	return path.resolve(__dirname, `../../dist/node_modules/${name}`)
}

export const getPackageJSON = function (name) {
	const pkgJSONPath = `${resolveSourcePkgPath(name)}/package.json`
	const jsonStr = fs.readFileSync(pkgJSONPath, { encoding: 'utf-8' })
	return JSON.parse(jsonStr)
}

export function getBaseConfig({
	alias = {
		__DEV__: true,
		preventAssignment: true,
	},
	typescript = {},
} = {}) {
	return [replace(alias), commonjsPlugin(), tsPlugin(typescript)]
}
