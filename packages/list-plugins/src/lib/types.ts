import { BaseGeneratedListTypes, CommonFieldConfig, ListHooks } from '@k6js/ks-next/types';

export type AtTrackingOptions = {
  created?: boolean;
  updated?: boolean;
  createdAtField?: string;
  updatedAtField?: string;
  isIndexed?: boolean | 'unique';
} & CommonFieldConfig<BaseGeneratedListTypes>;

export type ByTrackingOptions = {
  created?: boolean;
  updated?: boolean;
  createdByField?: string;
  updatedByField?: string;
  ref: string;
} & CommonFieldConfig<BaseGeneratedListTypes>;

export type ResolveInputHook = ListHooks<BaseGeneratedListTypes>['resolveInput'];
