import path from 'path';
import { Path } from 'graphql/jsutils/Path';

import {
  BaseGeneratedListTypes,
  fieldType,
  FieldTypeFunc,
  KeystoneContext,
} from '@k6js/ks-next/types';
import { graphql } from '@k6js/ks-next';
import { getFileRef } from './utils';
import { AzureStorageFieldConfig, AzureStorageFieldInputType, AzureStorageConfig, AzureStorageDataType, FileData } from './types';
import { getDataFromRef, getDataFromStream, getSrc } from './blob';

const views = path.join(path.dirname(__dirname), 'views/file');

const _fieldConfigs: { [key: string]: AzureStorageConfig } = {};

const AzureStorageFileFieldInput = graphql.inputObject({
  name: 'AzureStorageFileFieldInput',
  fields: {
    upload: graphql.arg({ type: graphql.Upload }),
    ref: graphql.arg({ type: graphql.String }),
  },
});

const fileOutputFields = graphql.fields<Omit<FileData, 'type'>>()({
  filename: graphql.field({ type: graphql.nonNull(graphql.String) }),
  filesize: graphql.field({ type: graphql.nonNull(graphql.Int) }),
  ref: graphql.field({
    type: graphql.nonNull(graphql.String),
    resolve(data) {
      return getFileRef(data.filename);
    },
  }),
  src: graphql.field({
    type: graphql.nonNull(graphql.String),
    resolve(data, args, context, info) {
      const { key, typename } = info.path.prev as Path;
      const config = _fieldConfigs[`${typename}-${key}`];
      return getSrc(config, { type: 'file', ...data } as AzureStorageDataType);
    },
  }),
});

const AzureStorageFileFieldOutput = graphql.interface<Omit<FileData, 'type'>>()({
  name: 'AzureStorageFileFieldOutput',
  fields: fileOutputFields,
  resolveType: () => 'AzureStorageFileFieldOutputType',
});

const AzureStorageFileFieldOutputType = graphql.object<Omit<FileData, 'type'>>()({
  name: 'AzureStorageFileFieldOutputType',
  interfaces: [AzureStorageFileFieldOutput],
  fields: fileOutputFields,
});

function createInputResolver(config: AzureStorageConfig) {
  return async function inputResolver(data: AzureStorageFieldInputType, context: KeystoneContext) {
    if (data === null || data === undefined) {
      return { filename: data, filesize: data };
    }

    if (data.ref) {
      if (data.upload) {
        throw new Error('Only one of ref and upload can be passed to AzureStorageFileFieldInput');
      }
      return getDataFromRef(config, 'file', data.ref) as any;
    }
    if (!data.upload) {
      throw new Error('Either ref or upload must be passed to FileFieldInput');
    }
    return getDataFromStream(config, 'file', await data.upload);
  };
}

export const azureStorageFile =
  <TGeneratedListTypes extends BaseGeneratedListTypes>({
    defaultValue,
    azureStorageConfig,
    ...config
  }: AzureStorageFieldConfig<TGeneratedListTypes>): FieldTypeFunc =>
  meta => {
    if ((config as any).isUnique) {
      throw Error('isUnique is not a supported option for field type file');
    }

    if (typeof azureStorageConfig === 'undefined') {
      throw new Error(
        `Must provide AzureStorageConfig option in AzureStorageImage field for List: ${meta.listKey}, field: ${meta.fieldKey}`
      );
    }
    _fieldConfigs[`${meta.listKey}-${meta.fieldKey}`] = azureStorageConfig;

    return fieldType({
      kind: 'multi',
      fields: {
        filename: { kind: 'scalar', scalar: 'String', mode: 'optional' },
        filesize: { kind: 'scalar', scalar: 'Int', mode: 'optional' },
      },
    })({
      ...config,
      input: {
        create: {
          arg: graphql.arg({ type: AzureStorageFileFieldInput }),
          resolve: createInputResolver(azureStorageConfig as AzureStorageConfig),
        },
        update: {
          arg: graphql.arg({ type: AzureStorageFileFieldInput }),
          resolve: createInputResolver(azureStorageConfig as AzureStorageConfig),
        },
      },
      output: graphql.field({
        type: AzureStorageFileFieldOutput,
        resolve({ value: { filename, filesize } }) {
          if (filename === null || filesize === null) {
            return null;
          }
          return { filename, filesize };
        },
      }),
      unreferencedConcreteInterfaceImplementations: [AzureStorageFileFieldOutputType],
      views,
    });
  };
