import * as fsExtra from 'fs-extra';

import * as config from './config';
import { ErrorCode } from './common';
import { Config } from './config';

const validConfig: Config = {
  version: 'v1',

  providers: [{
    id: 'test',
    driver: 'postgresql',

    options: {
      host: 'localhost',
      port: 5432,
      user: 'testuser',
      password: 'testpw',
      database: 'testdb'
    },

    discovery: [{
      schemas: { only: ['public'] },
      actions: ['ReadItem']
    }],
  }],

  authentication: false,

  server: {
    port: 8080
  }
};

const mockConfigs: { [key: string]: Partial<Config> } = {
  'no-version': {},
  'invalid-version': { version: '1' } as any,
  'invalid-top': { version: 'v1' },
  'invalid-nested': {
    ...validConfig,
    providers: [{
      driver: 'mysql'
    }] as any
  },
  'valid': validConfig
};

jest.mock('yaml-configuration-loader', () => ({
  load: (path: string) => mockConfigs[path.replace('.yaml', '')]
}));

describe('init()', () => {
  describe('when copy succeeds', () => {
    beforeEach(() => {
      jest.spyOn(fsExtra, 'copy').mockReturnValue(Promise.resolve());
    });

    it('does nothing', async () => {
      await config.init('test.yml');
    });
  });

  describe('when copy fails', () => {
    beforeEach(() => {
      jest.spyOn(fsExtra, 'copy').mockReturnValue(Promise.reject('oops'));
    });

    it('throws a wrapped error', async () => {
      expect.assertions(2);

      try {
        await config.init('test.yml');
      } catch (e) {
        expect(e.code).toBe(ErrorCode.HGCONFIG_INIT_FAILED);
        expect(e.message).toBe(`Failed to write hgconfig file 'test.yml'.`);
      }
    });
  });
});

describe('load()', () => {
  describe('when config does not have a version property', () => {
    it('throws an error', async () => {
      expect.assertions(2);

      try {
        await config.load('no-version.yaml');
      } catch (e) {
        expect(e.code).toBe(ErrorCode.HGCONFIG_VERSION_MISSING);
        expect(e.message).toBe(`hgconfig file is missing 'version' property.`);
      }
    });
  });

  describe('when config version is not valid', () => {
    it('throws an error', async () => {
      expect.assertions(2);

      try {
        await config.load('invalid-version.yaml');
      } catch (e) {
        expect(e.code).toBe(ErrorCode.HGCONFIG_SCHEMA_FAILURE);
        expect(e.message).toBe(`Failed to load a validation schema for the configuration version '1'`);
      }
    });
  });

  describe('when config is invalid', () => {
    it('throws an error describing top-level validation failures', async () => {
      expect.assertions(2);

      try {
        await config.load('invalid-top.yaml');
      } catch (e) {
        expect(e.code).toBe(ErrorCode.HGCONFIG_VALIDATION_FAILED);
        expect(e.message).toBe('hgconfig file failed validation: Missing required property: authentication');
      }
    });

    it('throws an error describing first nested validation failures', async () => {
      expect.assertions(2);

      try {
        await config.load('invalid-nested.yaml');
      } catch (e) {
        expect(e.code).toBe(ErrorCode.HGCONFIG_VALIDATION_FAILED);
        expect(e.message).toBe(
          `hgconfig file failed validation: Missing required property: discovery at path '/providers/0'`
        );
      }
    });
  });

  describe('when config is valid', () => {
    it('returns the config', async () => {
      const result = await config.load('valid.yaml');
      expect(result).toBe(mockConfigs.valid);
    });
  });
});
