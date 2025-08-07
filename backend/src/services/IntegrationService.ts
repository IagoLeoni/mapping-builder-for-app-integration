import { TemplateService } from './TemplateService';

interface MappingConnection {
  id: string;
  sourceField: {
    id: string;
    name: string;
    type: string;
    path: string;
  };
  targetPath: string;
  confidence?: number;        // ✅ NOVO: Campo confidence da IA
  reasoning?: string;         // ✅ NOVO: Campo reasoning da IA  
  aiGenerated?: boolean;      // ✅ NOVO: Campo aiGenerated da IA
  transformation?: any;
}

interface IntegrationConfig {
  integrationId: string;
  integrationName?: string;      // NOVO CAMPO
  clientName?: string;           // NOVO CAMPO
  eventName?: string;            // NOVO CAMPO
  customerEmail: string;
  systemEndpoint: string;
  mappings: MappingConnection[];
  systemPayload: any;
  transformationTasks?: any[];
  transformationVariables?: any[];
}

export class IntegrationService {
  /**
   * Generate Google Cloud Application Integration JSON using TemplateService
   */
  generateIntegrationJson(config: IntegrationConfig): any {
    try {
      // Validar se os templates existem
      if (!TemplateService.validateTemplates()) {
        throw new Error('Required templates are missing');
      }

      const { 
        integrationId, 
        integrationName, 
        clientName, 
        eventName, 
        customerEmail, 
        systemEndpoint, 
        systemPayload 
      } = config;
      
      // Usar nome da integração se fornecido, senão usar ID
      const finalIntegrationName = integrationName || integrationId;
      
      // Usar TemplateService para gerar a integração
      const integrationJson = TemplateService.generateIntegration({
        integrationName: finalIntegrationName,
        customerEmail: customerEmail,
        systemEndpoint: systemEndpoint,
        systemPayload: systemPayload,
        transformationTasks: config.transformationTasks || [],
        transformationVariables: config.transformationVariables || []
      });

      console.log(`📧 Email sendo passado para TemplateService: "${customerEmail}"`);
      console.log(`🔗 Endpoint sendo passado para TemplateService: "${systemEndpoint}"`);

      // Não adicionar parâmetros extras para evitar erros de formato
      // Metadata será rastreada através dos nomes dos arquivos e logs

      return integrationJson;
    } catch (error) {
      console.error('Error generating integration JSON:', error);
      throw new Error(`Failed to generate integration JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate JsonnetMapperTask using TemplateService
   */
  generateJsonnetMapperTask(
    taskId: string,
    jsonnetTemplate: string,
    displayName: string,
    positionX: number = 140,
    positionY: number = 100
  ): any {
    try {
      return TemplateService.generateJsonnetMapperTask(
        taskId,
        jsonnetTemplate,
        displayName,
        positionX,
        positionY
      );
    } catch (error) {
      console.error('Error generating JsonnetMapperTask:', error);
      throw new Error(`Failed to generate JsonnetMapperTask: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate integration configuration
   */
  validateConfig(config: IntegrationConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.integrationId) {
      errors.push('Integration ID is required');
    }

    if (!config.customerEmail) {
      errors.push('Customer email is required');
    }

    if (!config.systemEndpoint) {
      errors.push('System endpoint is required');
    }

    if (!config.systemPayload) {
      errors.push('System payload is required');
    }

    // Permitir integração sem mapeamentos para teste
    // if (!config.mappings || config.mappings.length === 0) {
    //   errors.push('At least one mapping is required');
    // }

    // Validar formato do email
    if (config.customerEmail && !this.isValidEmail(config.customerEmail)) {
      errors.push('Invalid email format');
    }

    // Validar formato do endpoint
    if (config.systemEndpoint && !this.isValidUrl(config.systemEndpoint)) {
      errors.push('Invalid endpoint URL format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate integration with transformations
   */
  generateIntegrationWithTransformations(config: IntegrationConfig): any {
    try {
      // Validar configuração
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }

      // Processar mapeamentos com transformações
      const transformationTasks: any[] = [];
      const transformationVariables: any[] = [];
      let taskIdCounter = 10;

      // Separar mapeamentos simples dos que têm transformações
      const simpleMappings = config.mappings.filter(m => !m.transformation);
      const transformationMappings = config.mappings.filter(m => m.transformation);

      // Gerar systemPayload para mapeamentos simples
      const systemPayload: any = {};
      simpleMappings.forEach(mapping => {
        const pathParts = mapping.targetPath.split('.');
        let current = systemPayload;
        
        for (let i = 0; i < pathParts.length - 1; i++) {
          if (!current[pathParts[i]]) {
            current[pathParts[i]] = {};
          }
          current = current[pathParts[i]];
        }
        
        const lastPart = pathParts[pathParts.length - 1];
        current[lastPart] = `$gupyPayload.${mapping.sourceField.path}$`;
      });

      // Processar transformações (se houver)
      transformationMappings.forEach((mapping, index) => {
        if (mapping.transformation?.type) {
          const varName = this.generateVariableName(mapping.sourceField.name);
          const inputPath = this.generateJsonnetPath(mapping.sourceField.path);
          
          // Gerar template Jsonnet baseado no tipo de transformação
          let jsonnetTemplate = '';
          
          switch (mapping.transformation.type) {
            // Transformações básicas
            case 'valueMapping':
              jsonnetTemplate = this.generateValueMappingJsonnet(varName, inputPath, mapping.transformation);
              break;
            case 'dateFormat':
              jsonnetTemplate = this.generateDateFormatJsonnet(varName, inputPath, mapping.transformation);
              break;
            case 'expression':
              jsonnetTemplate = this.generateExpressionJsonnet(varName, inputPath, mapping.transformation);
              break;
            case 'conditional':
              jsonnetTemplate = this.generateConditionalJsonnet(varName, inputPath, mapping.transformation);
              break;
            
            // Transformações geradas pela IA
            case 'format_document':
              jsonnetTemplate = this.generateFormatDocumentJsonnet(varName, inputPath, mapping.transformation);
              break;
            case 'phone_split':
              jsonnetTemplate = this.generatePhoneSplitJsonnet(varName, inputPath, mapping.transformation);
              break;
            case 'name_split':
              jsonnetTemplate = this.generateNameSplitJsonnet(varName, inputPath, mapping.transformation);
              break;
            case 'normalize':
              jsonnetTemplate = this.generateNormalizeJsonnet(varName, inputPath, mapping.transformation);
              break;
            case 'country_code':
              jsonnetTemplate = this.generateCountryCodeJsonnet(varName, inputPath, mapping.transformation);
              break;
            case 'gender_code':
              jsonnetTemplate = this.generateGenderCodeJsonnet(varName, inputPath, mapping.transformation);
              break;
            case 'code_lookup':
              jsonnetTemplate = this.generateCodeLookupJsonnet(varName, inputPath, mapping.transformation);
              break;
            case 'concat':
              jsonnetTemplate = this.generateConcatJsonnet(varName, inputPath, mapping.transformation);
              break;
            case 'split':
              jsonnetTemplate = this.generateSplitJsonnet(varName, inputPath, mapping.transformation);
              break;
            case 'convert':
              jsonnetTemplate = this.generateConvertJsonnet(varName, inputPath, mapping.transformation);
              break;
            case 'format_date':
              jsonnetTemplate = this.generateFormatDateJsonnet(varName, inputPath, mapping.transformation);
              break;
            
            default:
              console.warn(`Unsupported transformation type: ${mapping.transformation.type}`);
              return;
          }

          // Criar tarefa JsonnetMapperTask
          const transformationTask = this.generateJsonnetMapperTask(
            taskIdCounter.toString(),
            jsonnetTemplate,
            `Transform ${mapping.sourceField.name} (${mapping.transformation.type})`,
            140 + (index * 200),
            100
          );

          transformationTasks.push(transformationTask);

          // Adicionar variável para o resultado da transformação
          transformationVariables.push({
            "key": varName,
            "dataType": "STRING_VALUE",
            "defaultValue": {},
            "displayName": varName
          });

          // Adicionar ao systemPayload usando a variável transformada
          const targetPathParts = mapping.targetPath.split('.');
          let current = systemPayload;
          
          for (let i = 0; i < targetPathParts.length - 1; i++) {
            if (!current[targetPathParts[i]]) {
              current[targetPathParts[i]] = {};
            }
            current = current[targetPathParts[i]];
          }
          
          const lastPart = targetPathParts[targetPathParts.length - 1];
          current[lastPart] = `$${varName}$`;

          taskIdCounter++;
        }
      });

      // Gerar integração final
      return this.generateIntegrationJson({
        ...config,
        systemPayload,
        transformationTasks,
        transformationVariables
      });

    } catch (error) {
      console.error('Error generating integration with transformations:', error);
      throw new Error(`Failed to generate integration with transformations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Métodos auxiliares para gerar templates Jsonnet
  private generateValueMappingJsonnet(varName: string, inputPath: string, transformation: any): string {
    const mappingRules = Object.entries(transformation.rules || {})
      .map(([key, value]) => `  if inputValue == "${key}" then "${value}"`)
      .join('\n  else ');
    
    const defaultValue = transformation.defaultValue || 'inputValue';
    
    return `local f = import "functions";

local gupyPayload = f.extVar("gupyPayload");
local inputValue = ${inputPath};

local transformValue(value) = (
${mappingRules}
  else ${defaultValue}
);

{
  ${varName}: transformValue(inputValue)
}`;
  }

  private generateDateFormatJsonnet(varName: string, inputPath: string, transformation: any): string {
    return `local f = import "functions";

local gupyPayload = f.extVar("gupyPayload");
local inputValue = ${inputPath};

local transformDate(dateStr) = (
  f.dateFormat(f.parseDate(dateStr, "${transformation.fromFormat}"), "${transformation.toFormat}")
);

{
  ${varName}: transformDate(inputValue)
}`;
  }

  private generateExpressionJsonnet(varName: string, inputPath: string, transformation: any): string {
    const formula = transformation.formula.replace(/value/g, 'inputValue');
    
    return `local f = import "functions";

local gupyPayload = f.extVar("gupyPayload");
local inputValue = ${inputPath};

local transformExpression(value) = (
  ${formula}
);

{
  ${varName}: transformExpression(inputValue)
}`;
  }

  private generateConditionalJsonnet(varName: string, inputPath: string, transformation: any): string {
    const conditions = transformation.conditions
      .map((cond: any) => `  if inputValue ${cond.if} then "${cond.then}"`)
      .join('\n  else ');
    
    const defaultValue = transformation.defaultValue || 'inputValue';
    
    return `local f = import "functions";

local gupyPayload = f.extVar("gupyPayload");
local inputValue = ${inputPath};

local transformConditional(value) = (
${conditions}
  else ${defaultValue}
);

{
  ${varName}: transformConditional(inputValue)
}`;
  }

  // Métodos para gerar templates Jsonnet das transformações da IA (AUTO-CONTIDOS - SEM IMPORTS)
  private generateFormatDocumentJsonnet(varName: string, inputPath: string, transformation: any): string {
    return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: std.strReplace(std.strReplace(std.strReplace(inputValue, ".", ""), "-", ""), " ", "") }`;
  }

  private generatePhoneSplitJsonnet(varName: string, inputPath: string, transformation: any): string {
    const operation = transformation.operation || 'extract_area_code';
    if (operation === 'extract_area_code') {
      return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; local cleanPhone = std.strReplace(std.strReplace(inputValue, "+55", ""), " ", ""); { ${varName}: std.substr(cleanPhone, 0, 2) }`;
    } else if (operation === 'extract_phone_number') {
      return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; local cleanPhone = std.strReplace(std.strReplace(inputValue, "+55", ""), " ", ""); { ${varName}: std.substr(cleanPhone, 2, std.length(cleanPhone)) }`;
    }
    return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: inputValue }`;
  }

  private generateNameSplitJsonnet(varName: string, inputPath: string, transformation: any): string {
    const operation = transformation.operation || 'split_first_name';
    if (operation === 'split_first_name') {
      return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; local parts = std.split(inputValue, " "); { ${varName}: if std.length(parts) > 0 then parts[0] else "" }`;
    } else if (operation === 'split_last_name') {
      return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; local parts = std.split(inputValue, " "); { ${varName}: if std.length(parts) > 1 then std.join(" ", parts[1:]) else "" }`;
    }
    return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: inputValue }`;
  }

  private generateNormalizeJsonnet(varName: string, inputPath: string, transformation: any): string {
    const operation = transformation.operation || 'lower_case';
    if (operation === 'upper_case') {
      return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: std.asciiUpper(inputValue) }`;
    } else if (operation === 'lower_case') {
      return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: std.asciiLower(inputValue) }`;
    }
    return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: inputValue }`;
  }

  private generateCountryCodeJsonnet(varName: string, inputPath: string, transformation: any): string {
    return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: if inputValue == "Brasil" then "BRA" else if inputValue == "Brazil" then "BRA" else if inputValue == "BR" then "BRA" else inputValue }`;
  }

  private generateGenderCodeJsonnet(varName: string, inputPath: string, transformation: any): string {
    return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: if inputValue == "Male" then "M" else if inputValue == "Female" then "F" else if inputValue == "Masculino" then "M" else if inputValue == "Feminino" then "F" else inputValue }`;
  }

  private generateCodeLookupJsonnet(varName: string, inputPath: string, transformation: any): string {
    return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: inputValue }`;
  }

  private generateConcatJsonnet(varName: string, inputPath: string, transformation: any): string {
    const separator = transformation.separator || ' ';
    return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: std.join("${separator}", if std.isArray(inputValue) then inputValue else [inputValue]) }`;
  }

  private generateSplitJsonnet(varName: string, inputPath: string, transformation: any): string {
    const separator = transformation.separator || ' ';
    return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: std.split(inputValue, "${separator}") }`;
  }

  private generateConvertJsonnet(varName: string, inputPath: string, transformation: any): string {
    const operation = transformation.operation || 'string_conversion';
    if (operation === 'string_to_number') {
      return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: std.parseJson(inputValue) }`;
    } else if (operation === 'number_to_string') {
      return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: std.toString(inputValue) }`;
    }
    return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: inputValue }`;
  }

  private generateFormatDateJsonnet(varName: string, inputPath: string, transformation: any): string {
    return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: std.substr(inputValue, 0, 10) }`;
  }

  // Métodos auxiliares
  private generateVariableName(fieldName: string): string {
    const normalizedName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `transformed_mapping_${normalizedName}`;
  }

  private generateJsonnetPath(fieldPath: string): string {
    const pathParts = fieldPath.split('.');
    let jsonnetPath = 'gupyPayload';
    pathParts.forEach(part => {
      jsonnetPath += `["${part}"]`;
    });
    return jsonnetPath;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}
