import { BaseGeneratedListTypes, CommonFieldConfig } from '@k6js/ks-next/types';

export type DimensionData = {
  unit: string;
  length: number;
  width: number;
  height: number;
};

export type DimensionFieldInputType =
  | undefined
  | null
  | { unit: string; length: number; width: number; height: number; };

export type DimensionFieldConfig<TGeneratedListTypes extends BaseGeneratedListTypes> =
  CommonFieldConfig<TGeneratedListTypes> & {
    defaultUnit?: string | null;
    units?: { label: string; value: string; }[];
    ui?: {
      displayMode?: 'select' | 'segmented-control';
    };
    validation?: {
      isRequired?: boolean;
    };
  };
