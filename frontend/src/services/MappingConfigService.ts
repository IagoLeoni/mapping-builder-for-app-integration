import { MappingConnection, MappingConfigOutput, IntegrationConfig } from '../types';

export class MappingConfigService {
  static generateMappingConfig(
    mappings: MappingConnection[],
    config: IntegrationConfig,
    targetSchema: string = 'successfactors'
  ): MappingConfigOutput {
    const mappingConfig: MappingConfigOutput = {
      integrationId: `integration-${Date.now()}`,
      version: '1.0.0',
      sourceSchema: 'gupy',
      targetSchema,
      customerConfig: {
        email: config.customerEmail,
        endpoint: config.systemEndpoint
      },
      fieldMappings: mappings.map(mapping => ({
        id: mapping.id,
        source: mapping.sourceField.path,
        target: mapping.targetPath,
        transformation: mapping.transformation
      })),
      generatedAt: new Date().toISOString()
    };

    return mappingConfig;
  }

  static downloadMappingConfig(mappingConfig: MappingConfigOutput): void {
    const jsonString = JSON.stringify(mappingConfig, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `mapping-config-${mappingConfig.integrationId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  static validateMappingConfig(mappingConfig: MappingConfigOutput): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validar configuração do cliente
    if (!mappingConfig.customerConfig.email) {
      errors.push('Customer email is required');
    }
    if (!mappingConfig.customerConfig.endpoint) {
      errors.push('System endpoint is required');
    }

    // Validar mapeamentos
    if (mappingConfig.fieldMappings.length === 0) {
      errors.push('At least one field mapping is required');
    }

    // Validar cada mapeamento
    mappingConfig.fieldMappings.forEach((mapping, index) => {
      if (!mapping.source) {
        errors.push(`Mapping ${index + 1}: Source field is required`);
      }
      if (!mapping.target) {
        errors.push(`Mapping ${index + 1}: Target field is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static previewTransformationCode(mappingConfig: MappingConfigOutput): string {
    const transformations = mappingConfig.fieldMappings.map(mapping => {
      if (!mapping.transformation) {
        // Mapeamento direto
        return `"${mapping.target}": $gupyPayload.${mapping.source}$`;
      }

      // Mapeamento com transformação
      switch (mapping.transformation.type) {
        case 'valueMapping':
          const rules = Object.entries(mapping.transformation.rules || {})
            .map(([key, value]) => `"${key}": "${value}"`)
            .join(', ');
          return `"${mapping.target}": TRANSFORM_VALUE($gupyPayload.${mapping.source}$, {${rules}})`;
        
        case 'dateFormat':
          return `"${mapping.target}": FORMAT_DATE($gupyPayload.${mapping.source}$, "${mapping.transformation.fromFormat}", "${mapping.transformation.toFormat}")`;
        
        case 'expression':
          return `"${mapping.target}": EXPRESSION("${mapping.transformation.formula}", $gupyPayload.${mapping.source}$)`;
        
        case 'conditional':
          const conditions = mapping.transformation.conditions
            .map((cond: any) => `IF(${cond.if}) THEN "${cond.then}"`)
            .join(' ELSE ');
          return `"${mapping.target}": ${conditions} ELSE "${mapping.transformation.defaultValue || ''}"`;
        
        default:
          return `"${mapping.target}": $gupyPayload.${mapping.source}$`;
      }
    });

    return `{
  ${transformations.join(',\n  ')}
}`;
  }

  static generateIntegrationSummary(mappingConfig: MappingConfigOutput): {
    totalMappings: number;
    transformationsCount: number;
    transformationTypes: Record<string, number>;
    missingRequiredFields: string[];
  } {
    const transformationsCount = mappingConfig.fieldMappings.filter(m => m.transformation).length;
    const transformationTypes: Record<string, number> = {};
    
    mappingConfig.fieldMappings.forEach(mapping => {
      if (mapping.transformation) {
        const type = mapping.transformation.type;
        transformationTypes[type] = (transformationTypes[type] || 0) + 1;
      }
    });

    // Lista de campos obrigatórios para SuccessFactors (exemplo)
    const requiredFields = [
      'User.userId',
      'PerPersonal.firstName',
      'PerPersonal.lastName',
      'EmpEmployment.startDate'
    ];

    const mappedTargets = mappingConfig.fieldMappings.map(m => m.target);
    const missingRequiredFields = requiredFields.filter(field => !mappedTargets.includes(field));

    return {
      totalMappings: mappingConfig.fieldMappings.length,
      transformationsCount,
      transformationTypes,
      missingRequiredFields
    };
  }
}
