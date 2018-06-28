const connection: any = {
  manyOrNone: jest.fn(),
  result: jest.fn(),
  one: jest.fn(),
  task: jest.fn((callback: (context: any) => void) => callback(connection))
};

const connect = jest.fn(() => connection);

const factory = jest.fn(() => connect);

module.exports = factory;
