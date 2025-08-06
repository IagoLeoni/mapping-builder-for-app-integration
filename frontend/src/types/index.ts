export interface PayloadField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  path: string;
  value?: any;
  children?: PayloadField[];
}

export interface MappingConnection {
  id: string;
  sourceField: PayloadField;
  targetPath: string;
  transformation?: TransformationConfig;
  confidence?: number;
  reasoning?: string;
  aiGenerated?: boolean;
}

export interface TransformationConfig {
  type: 'valueMapping' | 'dateFormat' | 'expression' | 'conditional' | 'format_document' | 'concat' | 'split' | 'convert' | 'normalize' | 'format_date' | 'phone_split' | 'name_split' | 'country_code' | 'gender_code' | 'code_lookup';
  operation?: string;
  pattern?: string;
  parameters?: any;
  mapping?: Record<string, string>;
  separator?: string;
  preview?: {
    input: string;
    output: string;
  };
  [key: string]: any;
}

export interface ValueMappingConfig extends TransformationConfig {
  type: 'valueMapping';
  rules: Record<string, any>;
  defaultValue?: any;
  caseSensitive?: boolean;
}

export interface DateFormatConfig extends TransformationConfig {
  type: 'dateFormat';
  fromFormat: string;
  toFormat: string;
  timezone?: string;
}

export interface ExpressionConfig extends TransformationConfig {
  type: 'expression';
  formula: string;
  context?: Record<string, any>;
}

export interface ConditionalConfig extends TransformationConfig {
  type: 'conditional';
  conditions: Array<{
    if: string;
    then: any;
  }>;
  defaultValue?: any;
}

export interface MappingConfigOutput {
  integrationId: string;
  version: string;
  sourceSchema: string;
  targetSchema: string;
  customerConfig: {
    email: string;
    endpoint: string;
  };
  fieldMappings: Array<{
    id: string;
    source: string;
    target: string;
    transformation?: TransformationConfig;
  }>;
  generatedAt: string;
}

export interface IntegrationConfig {
  customerEmail: string;
  systemEndpoint: string;
  mappings: MappingConnection[];
  systemPayload: any;
}

export interface GupyPayload {
  companyName: string;
  id: string;
  event: string;
  date: string;
  data: {
    job: {
      id: number;
      code: string;
      name: string;
      department: {
        id: number;
        code: string;
        name: string;
        similarity: string;
      };
      role: {
        id: number;
        code: string;
        name: string;
        similarity: string;
      };
      branch: {
        id: number;
        code: string;
        name: string;
      };
      customFields: Array<{
        id: string;
        title: string;
        value: string;
      }>;
    };
    application: {
      id: number;
      score: number;
      preHiringInformation: Record<string, string>;
      tags: string[];
      currentStep: {
        id: number;
        name: string;
      };
    };
    user: {
      id: number;
      name: string;
      email: string;
    };
    candidate: {
      id: number;
      name: string;
      lastName: string;
      email: string;
      identificationDocument: string;
      countryOfOrigin: string;
      birthdate: string;
      addressZipCode: string;
      addressStreet: string;
      addressNumber: string;
      addressCity: string;
      addressState: string;
      addressStateShortName: string;
      addressCountry: string;
      addressCountryShortName: string;
      mobileNumber: string;
      phoneNumber: string;
      schooling: string;
      schoolingStatus: string;
      disabilities: boolean;
      gender: string;
    };
    [key: string]: any;
  };
}

export interface DroppableArea {
  id: string;
  type: 'field' | 'object' | 'array';
  path: string;
  accepts: string[];
}
