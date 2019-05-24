
type AdvancedResult<D = undefined> = {
  success: false,
  code: string,
  message: string,
  data?: D,
} | (
  D extends undefined ? {
    success: true,
    code?: string,
    message?: string,
    data?: D,
  } : {
    success: true,
    code?: string,
    message?: string,
    data: D,
  }
)
