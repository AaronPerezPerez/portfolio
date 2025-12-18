/**
 * UserId Value Object
 * Immutable identifier for users with validation
 */

import { Result } from '../../shared/Result';

const USER_ID_MIN_LENGTH = 8;
const USER_ID_MAX_LENGTH = 64;
const USER_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

export class UserId {
  private constructor(private readonly _value: string) {
    Object.freeze(this);
  }

  get value(): string {
    return this._value;
  }

  /**
   * Creates a UserId from a string, validating the format
   */
  static create(value: string): Result<UserId, string> {
    const trimmed = value.trim();

    if (!trimmed) {
      return Result.fail('UserId cannot be empty');
    }

    if (trimmed.length < USER_ID_MIN_LENGTH) {
      return Result.fail(`UserId must be at least ${USER_ID_MIN_LENGTH} characters`);
    }

    if (trimmed.length > USER_ID_MAX_LENGTH) {
      return Result.fail(`UserId cannot exceed ${USER_ID_MAX_LENGTH} characters`);
    }

    if (!USER_ID_PATTERN.test(trimmed)) {
      return Result.fail('UserId can only contain alphanumeric characters, hyphens, and underscores');
    }

    return Result.ok(new UserId(trimmed));
  }

  /**
   * Creates a UserId without validation (use for trusted sources like DB)
   */
  static fromTrusted(value: string): UserId {
    return new UserId(value);
  }

  /**
   * Returns shortened version for display (first 8 chars)
   */
  toShort(): string {
    return this._value.substring(0, 8);
  }

  equals(other: UserId): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
