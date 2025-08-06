import { TransformationConfig } from '../types';

export class TemplateService {
  private static baseUrl = '/templates';

  // Carregar template de arquivo (sempre usar fallback no frontend)
  private static async loadTemplate(path: string): Promise<string> {
    // No frontend, sempre usar templates inline para evitar problemas de fetch
    return this.getFallbackTemplate(path);
  }

  // Templates fallback inline
  private static getFallbackTemplate(path: string): string {
    const fallbackTemplates: Record<string, string> = {
      'transformations/value-mapping.jsonnet': `local f = import "functions";

local gupyPayload = f.extVar("gupyPayload");
local inputValue = {{INPUT_PATH}};

local transformValue(value) = (
{{MAPPING_RULES}}
  else {{DEFAULT_VALUE}}
);

{
  {{VAR_NAME}}: transformValue(inputValue)
}`,
      'transformations/date-format.jsonnet': `local f = import "functions";

local gupyPayload = f.extVar("gupyPayload");
local inputValue = {{INPUT_PATH}};

local transformDate(dateStr) = (
  f.dateFormat(f.parseDate(dateStr, "{{FROM_FORMAT}}"), "{{TO_FORMAT}}")
);

{
  {{VAR_NAME}}: transformDate(inputValue)
}`,
      'transformations/expression.jsonnet': `local f = import "functions";

local gupyPayload = f.extVar("gupyPayload");
local inputValue = {{INPUT_PATH}};

local transformExpression(value) = (
  {{FORMULA}}
);

{
  {{VAR_NAME}}: transformExpression(inputValue)
}`,
      'transformations/conditional.jsonnet': `local f = import "functions";

local gupyPayload = f.extVar("gupyPayload");
local inputValue = {{INPUT_PATH}};

local transformConditional(value) = (
{{CONDITIONS}}
  else {{DEFAULT_VALUE}}
);

{
  {{VAR_NAME}}: transformConditional(inputValue)
}`
    };

    return fallbackTemplates[path] || '';
  }

  // Substituir placeholders no template
  private static replacePlaceholders(template: string, replacements: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      const placeholder = `{{${key}}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }
    return result;
  }

  // Gerar template Jsonnet para Value Mapping
  static async generateValueMappingTemplate(
    varName: string,
    inputPath: string,
    rules: Record<string, string>,
    defaultValue?: string
  ): Promise<string> {
    const template = await this.loadTemplate('transformations/value-mapping.jsonnet');
    
    const mappingRules = Object.entries(rules)
      .map(([key, value]) => `  if inputValue == "${key}" then "${value}"`)
      .join('\n  else ');
    
    const finalDefaultValue = defaultValue || 'inputValue';
    
    return this.replacePlaceholders(template, {
      VAR_NAME: varName,
      INPUT_PATH: inputPath,
      MAPPING_RULES: mappingRules,
      DEFAULT_VALUE: finalDefaultValue
    });
  }

  // Gerar template Jsonnet para Date Format
  static async generateDateFormatTemplate(
    varName: string,
    inputPath: string,
    fromFormat: string,
    toFormat: string
  ): Promise<string> {
    const template = await this.loadTemplate('transformations/date-format.jsonnet');
    
    return this.replacePlaceholders(template, {
      VAR_NAME: varName,
      INPUT_PATH: inputPath,
      FROM_FORMAT: fromFormat,
      TO_FORMAT: toFormat
    });
  }

  // Gerar template Jsonnet para Expression
  static async generateExpressionTemplate(
    varName: string,
    inputPath: string,
    formula: string
  ): Promise<string> {
    const template = await this.loadTemplate('transformations/expression.jsonnet');
    
    return this.replacePlaceholders(template, {
      VAR_NAME: varName,
      INPUT_PATH: inputPath,
      FORMULA: formula
    });
  }

  // Gerar template Jsonnet para Conditional
  static async generateConditionalTemplate(
    varName: string,
    inputPath: string,
    conditions: Array<{ if: string; then: string }>,
    defaultValue?: string
  ): Promise<string> {
    const template = await this.loadTemplate('transformations/conditional.jsonnet');
    
    const conditionRules = conditions
      .map((cond) => `  if inputValue ${cond.if} then "${cond.then}"`)
      .join('\n  else ');
    
    const finalDefaultValue = defaultValue || 'inputValue';
    
    return this.replacePlaceholders(template, {
      VAR_NAME: varName,
      INPUT_PATH: inputPath,
      CONDITIONS: conditionRules,
      DEFAULT_VALUE: finalDefaultValue
    });
  }

  // Gerar template genérico baseado no tipo de transformação
  static async generateTransformationTemplate(
    type: TransformationConfig['type'],
    varName: string,
    inputPath: string,
    transformation: TransformationConfig
  ): Promise<string> {
    switch (type) {
      case 'valueMapping':
        return this.generateValueMappingTemplate(
          varName,
          inputPath,
          transformation.rules || {},
          transformation.defaultValue
        );
      
      case 'dateFormat':
        return this.generateDateFormatTemplate(
          varName,
          inputPath,
          transformation.fromFormat || 'DD/MM/YYYY',
          transformation.toFormat || 'YYYY-MM-DD'
        );
      
      case 'expression':
        return this.generateExpressionTemplate(
          varName,
          inputPath,
          transformation.formula || 'inputValue'
        );
      
      case 'conditional':
        return this.generateConditionalTemplate(
          varName,
          inputPath,
          transformation.conditions || [],
          transformation.defaultValue
        );
      
      default:
        throw new Error(`Unsupported transformation type: ${type}`);
    }
  }

  // Gerar path Jsonnet para acessar campo no payload
  static generateJsonnetPath(fieldPath: string): string {
    const pathParts = fieldPath.split('.');
    let jsonnetPath = 'gupyPayload';
    pathParts.forEach(part => {
      jsonnetPath += `["${part}"]`;
    });
    return jsonnetPath;
  }

  // Gerar nome de variável baseado no nome do campo
  static generateVariableName(fieldName: string): string {
    const normalizedName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `transformed_mapping_${normalizedName}`;
  }
}
