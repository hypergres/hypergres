import * as common from './common';
import { handleError } from './common';

describe('handleError', () => {
  describe('when `err` is a plain error', () => {
    describe('when `log` is omitted', () => {
      it('logs the message to the console', () => {
        jest.spyOn(console, 'error').mockReturnValue(undefined);

        const err = new Error('Oh no');
        common.handleError(err);

        expect(console.error).toHaveBeenCalledWith(err);
      });
    });

    describe('when `log` is given', () => {
      it('logs the message using the logger', () => {
        const err = new Error('Oh no');
        const logger = {
          error: jest.fn()
        };

        common.handleError(err, logger as any);

        expect(logger.error).toHaveBeenCalledWith(err);
      });
    });
  });

  describe('when `err` is a WrappedError', () => {
    describe('when `log` is omitted', () => {
      it('logs the wrapped error to the console', () => {
        jest.spyOn(console, 'error').mockReturnValue(undefined);
        const err = new Error('Oh no');

        const wrapped = new common.WrappedError({
          code: common.ErrorCode.CORE_NOT_CONFIGURED,
          message: 'Something bad happened',
          err
        });

        handleError(wrapped);

        expect(console.error).toHaveBeenCalledWith('Something bad happened');
        expect(console.error).toHaveBeenCalledWith(err);
      });

      it('logs the message and wrapper to the console', () => {
        jest.spyOn(console, 'error').mockReturnValue(undefined);
        const wrapped = new common.WrappedError({
          code: common.ErrorCode.CORE_NOT_CONFIGURED,
          message: 'Something bad happened',
        });

        handleError(wrapped);

        expect(console.error).toHaveBeenCalledWith('Something bad happened');
        expect(console.error).toHaveBeenCalledWith(wrapped);
      });
    });

    describe('when `log` is given', () => {
      it('logs the wrapped error using the logger', () => {
        const err = new Error('Oh no');
        const wrapped = new common.WrappedError({
          code: common.ErrorCode.CORE_NOT_CONFIGURED,
          message: 'Something bad happened',
          err
        });
        const logger = {
          error: jest.fn()
        };

        handleError(wrapped, logger as any);

        expect(logger.error).toHaveBeenCalledWith(err, 'Something bad happened');
      });

      it('logs the message and wrapper using the logger', () => {
        const wrapped = new common.WrappedError({
          code: common.ErrorCode.CORE_NOT_CONFIGURED,
          message: 'Something bad happened'
        });
        const logger = {
          error: jest.fn()
        };

        handleError(wrapped, logger as any);

        expect(logger.error).toHaveBeenCalledWith('Something bad happened');
      });
    });
  });
});
