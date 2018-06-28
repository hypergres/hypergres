import { load as _load } from 'yaml-configuration-loader';
import { resolve } from 'path';
import { readJSON, copy } from 'fs-extra';
import * as tv4 from 'tv4';

import { ErrorCode, WrappedError } from './common';
import { V1 as Config, Provider } from './config/v1';

export { Config, Provider };

/**
 * Initializes a new hgconfig YAML file by copying the internal template file to
 * a given destination on disk. Will throw an error if a file already exists at
 * `path`.
 *
 * @param path The relative path to the YAML file to write.
 */
export const init = async (path: string) => {
  const src = resolve(__dirname, 'config', 'template.yaml');
  const dest = resolve(process.cwd(), path);

  try {
    await copy(src, dest, {
      overwrite: false,
      errorOnExist: true
    });

    return dest;
  } catch (err) {
    throw new WrappedError({
      code: ErrorCode.HGCONFIG_INIT_FAILED,
      message: `Failed to write hgconfig file '${path}'.`,
      err
    });
  }
};

/**
 * Loads and validates an hgconfig YAML file.
 *
 * @param path The relative path to the YAML file to load.
 * @return The hgconfig parsed as a JavaScript object conforming to the Config
 * interface.
 * @warning This function will block the event queue due to the synchronous IO
 * used by 'yaml-configuration-loader'.
 */
export const load = async (path: string) => {
  const config = _load(path) as Config;

  if (!config || !config.version) {
    throw new WrappedError({
      code: ErrorCode.HGCONFIG_VERSION_MISSING,
      message: `hgconfig file is missing 'version' property.`
    });
  }

  const version = config.version.toLowerCase();

  let schema: tv4.JsonSchema;
  try {
    const schemaPath = resolve(__dirname, 'config', `${version}.json`);
    schema = await readJSON(schemaPath);
  } catch (err) {
    throw new WrappedError({
      code: ErrorCode.HGCONFIG_SCHEMA_FAILURE,
      message: `Failed to load a validation schema for the configuration version '${version}'`,
      err
    });
  }

  const valid = tv4.validate(config, schema);
  if (!valid) {
    throw new WrappedError({
      code: ErrorCode.HGCONFIG_VALIDATION_FAILED,
      message: `hgconfig file failed validation: ${formatValidationError(tv4.error)}`
    });
  }

  return config;
};

/**
 * Formats a TV4 Validation error message and data path (if applicable) into a
 * single string
 */
const formatValidationError = (error: tv4.ErrorVar): string => {
  const { message, dataPath } = relevantValidationError(error);

  return dataPath ?
    `${message} at path '${dataPath}'` :
    message;
};

/**
 * Determines the most relevant TV4 validation error, either the top-level error
 * or the first sub-Error, if any are present.
 */
const relevantValidationError = (error: tv4.ErrorVar): tv4.ErrorVar =>
  error.subErrors ? error.subErrors[0] : error;
