export interface ParamsData {
  agg: string
  clipRange?: [number, number]
}

export interface ParamsPreprocess {
  smoothWindow: number
  diffOrder: number
}

export interface ParamsMutation {
  mutationMethod: string
  minSegLen: number
}
