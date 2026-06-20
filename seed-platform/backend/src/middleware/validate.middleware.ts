import { Request, Response, NextFunction } from 'express'
import { validationResult, ValidationChain } from 'express-validator'

export function validate(chains: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(chains.map((chain) => chain.run(req)))

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({
        error: 'Validation failed',
        details: errors.array().map((e) => ({
          field: e.type === 'field' ? e.path : 'unknown',
          message: e.msg,
        })),
      })
      return
    }

    next()
  }
}
