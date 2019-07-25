
type AdvancedResult<T = undefined> = {
  success: false
  code: string
  message: string
  data?: T
} | (
  T extends undefined ? {
    success: true
    code?: undefined
    message?: undefined
    data?: T
  } : {
    success: true
    code?: undefined
    message?: undefined
    data: T
  }
)

type primitive = string | number | boolean | undefined | null

type DeepReadonly<T> = T extends primitive ? T : DeepReadonlyObject<T>
type DeepReadonlyObject<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> }

type MaybeArray<T> = T | T[]

type MaybeObject<T> = T | {[x: string]: T}

declare module 'steam-user';
