type PlainObject = Record<string, any>

export type ArrayMergeStrategy = 'concat' | 'overwrite'

function isObject(val: unknown): val is PlainObject {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function mergeArrays(target: any[], source: any[], strategy: ArrayMergeStrategy): any[] {
  if (strategy === 'overwrite')
    return source.slice()
  return [...source, ...target]
}

export function deepMerge<T extends any[], U extends any[]>(
  target: T,
  source: U,
  options?: { arrayStrategy?: ArrayMergeStrategy },
): any
export function deepMerge<T extends PlainObject, U extends PlainObject>(
  target: T,
  source: U,
  options?: { arrayStrategy?: ArrayMergeStrategy },
): T & U
export function deepMerge(target: any, source: any, options: { arrayStrategy?: ArrayMergeStrategy } = {}) {
  const strategy = options.arrayStrategy ?? 'concat'
  if (Array.isArray(target) && Array.isArray(source))
    return mergeArrays(target, source, strategy)
  const result: PlainObject = { ...source }
  for (const key of Object.keys(target)) {
    const targetVal = target[key]
    const sourceVal = result[key]

    if (Array.isArray(targetVal) && Array.isArray(sourceVal)) {
      result[key] = mergeArrays(targetVal, sourceVal, strategy)
      continue
    }

    if (isObject(targetVal) && isObject(sourceVal)) {
      result[key] = deepMerge(targetVal, sourceVal, options)
      continue
    }

    result[key] = targetVal
  }

  return result
}
