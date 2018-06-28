import * as Logger from 'bunyan';
import { allPass, has } from 'ramda';

/**
 * Application-wide error codes to improve error handling
 */
export enum ErrorCode {
  HGCONFIG_INIT_FAILED = 1,
  HGCONFIG_VERSION_MISSING,
  HGCONFIG_SCHEMA_FAILURE,
  HGCONFIG_VALIDATION_FAILED,
  CORE_NOT_CONFIGURED,
  CORE_NO_PROVIDERS,
  PROVIDER_DRIVER_NOT_FOUND,
}

/**
 * An extended error code containing the original Error object, a human-friendly
 * message and a numeric Error Code.
 */
interface WrappedErrorProps {
  /**
   * A numeric error code that will be used as the process exit code.
   */
  code: ErrorCode;
  /**
   * Describes why the error code in a more human-friendly manner.
   */
  message: string;
  /**
   * The original Error object.
   */
  err?: any;
}

/**
 * Extends the base Error object to support process exit codes and a
 * human-friendly error message.
 */
export class WrappedError extends Error implements WrappedErrorProps {
  /**
   * A numeric error code that will be used as the process exit code.
   */
  code!: ErrorCode;
  /**
   * Describes why the error code in a more human-friendly manner.
   */
  message!: string;
  /**
   * The original Error object.
   */
  err?: Error;

  constructor(props: WrappedErrorProps) {
    super(props.message);
    Object.assign(this, props);
  }
}

/**
 * Determines if an Error-like object is a plain JavaScript Error or a
 * WrappedError.
 */
const isWrappedError: (err: WrappedError | Error) => err is WrappedError =
  allPass([
    has('code'),
    has('message')
  ]) as any;

/**
 * Send error information to the Console or a Bunyan logger.
 *
 * If `err` is a WrappedError, then extended information will be printed and the
 * process exit code will be set to `err.code`.
 * If `log` is given, then information will be logged in a Bunyan-compatible
 * format.
 */
export const handleError = (err: WrappedError | Error, log?: Logger) => {
  if (!isWrappedError(err)) {
    return (log ? log : console).error(err);
  }

  process.exitCode = err.code;

  if (log) {
    return err.err ? log.error(err.err, err.message) : log.error(err.message);
  }

  console.error(err.message);
  console.error(err.err || err);
};
