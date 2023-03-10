import path from 'node:path'
import { createUnplugin } from 'unplugin'
import { createFilter } from '@rollup/pluginutils'
import { camelCase } from 'change-case'
import {
  MagicString,
  babelParse,
  getLang,
  getTransformResult,
} from '@vue-macros/common'
import { resolveOption } from './core/options'
import type { ExportDefaultDeclaration, Node } from '@babel/types'
import type { Options } from './core/options'

function resolveName(id: string) {
  return camelCase(path.basename(id, 'vue'))
}

function getNodeStart(node: Node) {
  if (node.leadingComments && node.leadingComments.length > 0) {
    return node.leadingComments[0].start!
  }
  return node.start!
}

export default createUnplugin<Options | undefined>((rawOptions = {}) => {
  const options = resolveOption(rawOptions)
  const filter = createFilter(options.include, options.exclude)

  const name = 'unplugin-vue-named-export'
  return {
    name,
    enforce: 'post',

    transformInclude(id) {
      return filter(id)
    },

    transform(code, id) {
      const lang = getLang(id)

      const program = babelParse(code, lang, {
        sourceType: 'module',
      })
      const defaultExport = program.body.find(
        (node): node is ExportDefaultDeclaration =>
          node.type === 'ExportDefaultDeclaration'
      )
      if (!defaultExport) return

      const s = new MagicString(code)
      const resolvedName = (options.resolveName || resolveName)(id)

      s.overwrite(
        defaultExport.start!,
        getNodeStart(defaultExport.declaration),
        `export const ${resolvedName} = `
      )

      return getTransformResult(s, id)
    },
  }
})
