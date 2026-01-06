import { createGenerator } from '@unocss/core'
import unoConfig from '../../uno.config'

export async function genUnoStyles(className: string) {
  const generator = await createGenerator(
    unoConfig,
  )
  const { css } = await generator.generate(className)
  return css
}
