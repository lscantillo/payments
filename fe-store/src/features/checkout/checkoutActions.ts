import { createAction } from '@reduxjs/toolkit'
import type { Transaction } from '../../domain/types'

export const transactionCreated = createAction<Transaction>('checkout/transactionCreated')
