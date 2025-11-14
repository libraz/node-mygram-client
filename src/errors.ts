/**
 * MygramDB client error classes
 */

/**
 * Base MygramDB client error
 *
 * @class
 * @extends Error
 */
export class MygramError extends Error {
  /**
   * Create a MygramDB error
   *
   * @param {string} message - Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'MygramError';
    Object.setPrototypeOf(this, MygramError.prototype);
  }
}

/**
 * Connection error thrown when connection to MygramDB server fails
 *
 * @class
 * @extends MygramError
 */
export class ConnectionError extends MygramError {
  /**
   * Create a connection error
   *
   * @param {string} message - Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
    Object.setPrototypeOf(this, ConnectionError.prototype);
  }
}

/**
 * Protocol error thrown when server returns an invalid response
 *
 * @class
 * @extends MygramError
 */
export class ProtocolError extends MygramError {
  /**
   * Create a protocol error
   *
   * @param {string} message - Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'ProtocolError';
    Object.setPrototypeOf(this, ProtocolError.prototype);
  }
}

/**
 * Timeout error thrown when request times out
 *
 * @class
 * @extends MygramError
 */
export class TimeoutError extends MygramError {
  /**
   * Create a timeout error
   *
   * @param {string} message - Error message
   */
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}
