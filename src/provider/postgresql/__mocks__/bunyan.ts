const info = jest.fn();
const error = jest.fn();

export const createLogger = jest.fn(() => ({ info, error }));
