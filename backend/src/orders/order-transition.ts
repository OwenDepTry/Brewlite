import { ConflictException } from '@nestjs/common';
import { InvalidOrderTransitionError, OrderStatus, assertTransition } from '../domain/order-status';

/** assertTransition nhưng đổi lỗi nghiệp vụ thành HTTP 409 Conflict */
export function ensureTransition(from: OrderStatus, to: OrderStatus): OrderStatus {
  try {
    return assertTransition(from, to);
  } catch (err) {
    if (err instanceof InvalidOrderTransitionError) {
      throw new ConflictException(err.message);
    }
    throw err;
  }
}
