import { Router } from 'express';
import { TransformationEngine, TransformationConfig } from '../services/TransformationEngine';
import { TemplateService } from '../services/TemplateService';
import { IntegrationService } from '../services/IntegrationService';

// Interface para mapeamentos (temporária, até unificar com frontend)
interface MappingConnection {
  id: string;
  sourceField: {
    id: string;
    name: string;
    type: string;
    path: string;
  };
  targetPath: string;
  transformation?: TransformationConfig;
  confidence?: number;
  reasoning?: string;
  aiGenerated?: boolean;
}

const router = Router();

/**
 * Testar transformações individuais
 */
router.post('/test', async (req, res) => {
  try {
    const { value, transformation } = req.body;

    if (!value || !transformation) {
      return res.status(400).json({
        error: 'Parâmetros obrigatórios: value, transformation'
      });
    }

    // Aplicar transformação
    const result = TransformationEngine.applyTransformation(value, transformation);
    
    // Gerar preview
    const preview = TransformationEngine.generatePreview(value, transformation);

    return res.json({
      success: true,
      input: value,
      output: result,
      transformation: transformation,
      preview: preview
    });

  } catch (error) {
    console.error('Erro ao testar transformação:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Testar múltiplas transformações
 */
router.post('/test-multiple', async (req, res) => {
  try {
    const { value, transformations } = req.body;

    if (!value || !Array.isArray(transformations)) {
      return res.status(400).json({
        error: 'Parâmetros obrigatórios: value (string), transformations (array)'
      });
    }

    // Aplicar transformações em sequência
    const result = TransformationEngine.applyTransformations(value, transformations);
    
    // Gerar preview de cada etapa
    const steps = [];
    let currentValue = value;
    
    for (const transformation of transformations) {
      const stepResult = TransformationEngine.applyTransformation(currentValue, transformation);
      steps.push({
        transformation: transformation,
        input: currentValue,
        output: stepResult
      });
      currentValue = stepResult;
    }

    return res.json({
      success: true,
      originalValue: value,
      finalResult: result,
      steps: steps
    });

  } catch (error) {
    console.error('Erro ao testar múltiplas transformações:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Gerar integração com transformações automáticas (usando IntegrationService)
 */
router.post('/generate-integration', async (req, res) => {
  try {
    const { integrationName, customerEmail, systemEndpoint, mappings, systemPayload } = req.body;

    if (!integrationName || !customerEmail || !systemEndpoint || !Array.isArray(mappings)) {
      return res.status(400).json({
        error: 'Parâmetros obrigatórios: integrationName, customerEmail, systemEndpoint, mappings'
      });
    }

    // Usar IntegrationService para garantir que transformações sejam processadas corretamente
    const integrationService = new IntegrationService();
    const integration = integrationService.generateIntegrationWithTransformations({
      integrationId: integrationName,
      customerEmail,
      systemEndpoint,
      mappings,
      systemPayload: systemPayload || {}
    });

    // Contar transformações aplicadas
    const transformationsCount = mappings.filter((m: any) => m.transformation).length;
    const transformationTasks = integration.taskConfigs?.filter((task: any) => task.taskType === 'JsonnetMapperTask') || [];
    
    return res.json({
      success: true,
      integration: integration,
      statistics: {
        totalMappings: mappings.length,
        transformationsApplied: transformationsCount,
        transformationTasks: transformationTasks.length,
        transformationTypes: [...new Set(mappings
          .filter((m: any) => m.transformation)
          .map((m: any) => m.transformation.type)
        )]
      },
      transformationDetails: transformationTasks.map((task: any) => ({
        taskId: task.taskId,
        displayName: task.displayName,
        jsonnetTemplate: task.taskConfig?.jsonnetTemplate?.substring(0, 200) + '...' // Preview do código
      }))
    });

  } catch (error) {
    console.error('Erro ao gerar integração com transformações:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Preview do JSON de integração final (para uso no frontend)
 * CORRIGIDO: Agora usa IntegrationService para geração robusta
 */
router.post('/preview-integration', async (req, res) => {
  try {
    const { customerEmail, systemEndpoint, mappings, systemPayload } = req.body;

    console.log('🔍 DEBUG: Endpoint preview-integration chamado com:', {
      customerEmail,
      systemEndpoint,
      mappingsCount: (mappings || []).length,
      mappingsWithTransformations: (mappings || []).filter((m: any) => m.transformation).length,
      systemPayload: systemPayload ? 'provided' : 'empty'
    });

    // Validação mais flexível - permitir integração mesmo sem email/endpoint para debug
    if (!customerEmail && !systemEndpoint) {
      console.log('⚠️ WARNING: No customerEmail or systemEndpoint provided, using defaults for debug');
    }

    const config = {
      integrationId: `int-${Date.now()}`,
      customerEmail: customerEmail || 'debug@example.com',
      systemEndpoint: systemEndpoint || 'https://debug.example.com/webhook',
      mappings: mappings || [],
      systemPayload: systemPayload || {}
    };

    // Usar IntegrationService ao invés de código hardcoded
    const integrationService = new IntegrationService();
    
    console.log('🚀 Generating integration using IntegrationService...');
    const integrationJson = integrationService.generateIntegrationWithTransformations(config);
    
    console.log('✅ Integration generated successfully:', {
      taskConfigs: integrationJson.taskConfigs?.length || 0,
      integrationParameters: integrationJson.integrationParameters?.length || 0,
      hasTransformationTasks: integrationJson.taskConfigs?.some((task: any) => task.task === 'JsonnetMapperTask') || false
    });

    // Estatísticas para debug
    const transformationMappings = (mappings || []).filter((m: any) => m.transformation && m.transformation.type);
    const transformationTasks = integrationJson.taskConfigs?.filter((task: any) => task.task === 'JsonnetMapperTask') || [];
    
    res.json({
      success: true,
      integrationJson,
      summary: {
        totalMappings: (mappings || []).length,
        transformationsCount: transformationMappings.length,
        transformationTasksGenerated: transformationTasks.length,
        taskConfigs: integrationJson.taskConfigs?.length || 0,
        variables: integrationJson.integrationParameters?.length || 0
      },
      transformations: transformationMappings.map((m: any) => ({
        sourceField: m.sourceField.path,
        targetPath: m.targetPath,
        transformationType: m.transformation.type,
        transformationConfig: m.transformation,
        confidence: m.confidence
      })),
      debug: {
        configUsed: config,
        transformationTaskIds: transformationTasks.map((task: any) => task.taskId),
        jsonnetTemplatesCount: transformationTasks.length
      },
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro ao gerar preview da integração:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

/**
 * Testar transformações específicas do Gupy
 */
router.post('/test-gupy', async (req, res) => {
  try {
    // Dados de exemplo do Gupy
    const gupyTestData = {
      cpf: "269.622.778-06",
      phone: "+5511999990000",
      name: "João Silva Santos",
      country: "Brasil",
      gender: "Male",
      city: "São Paulo",
      zipCode: "01414-905"
    };

    const results = {
      cpf_formatting: TransformationEngine.applyTransformation(gupyTestData.cpf, {
        type: 'format_document',
        operation: 'removeFormatting',
        pattern: 'cpf'
      }),
      
      phone_area_code: TransformationEngine.applyTransformation(gupyTestData.phone, {
        type: 'phone_split',
        operation: 'extract_area_code'
      }),
      
      phone_number: TransformationEngine.applyTransformation(gupyTestData.phone, {
        type: 'phone_split',
        operation: 'extract_phone_number'
      }),
      
      first_name: TransformationEngine.applyTransformation(gupyTestData.name, {
        type: 'name_split',
        operation: 'split_first_name'
      }),
      
      last_name: TransformationEngine.applyTransformation(gupyTestData.name, {
        type: 'name_split',
        operation: 'split_last_name'
      }),
      
      country_code: TransformationEngine.applyTransformation(gupyTestData.country, {
        type: 'country_code',
        operation: 'name_to_iso',
        mapping: { 'Brasil': 'BRA', 'Brazil': 'BRA' }
      }),
      
      gender_code: TransformationEngine.applyTransformation(gupyTestData.gender, {
        type: 'gender_code',
        operation: 'convert_gender',
        mapping: { 'Male': 'M', 'Female': 'F' }
      }),
      
      city_upper: TransformationEngine.applyTransformation(gupyTestData.city, {
        type: 'normalize',
        operation: 'upper_case'
      }),
      
      zipcode_clean: TransformationEngine.applyTransformation(gupyTestData.zipCode, {
        type: 'format_document',
        operation: 'removeFormatting',
        pattern: 'cep'
      })
    };

    res.json({
      success: true,
      testData: gupyTestData,
      transformations: results,
      summary: {
        totalTransformations: Object.keys(results).length,
        transformationTypes: [
          'format_document',
          'phone_split', 
          'name_split',
          'country_code',
          'gender_code',
          'normalize'
        ]
      }
    });

  } catch (error) {
    console.error('Erro ao testar transformações do Gupy:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Validar transformação
 */
router.post('/validate', async (req, res) => {
  try {
    const { value, transformation } = req.body;

    if (!value || !transformation) {
      return res.status(400).json({
        error: 'Parâmetros obrigatórios: value, transformation'
      });
    }

    const isValid = TransformationEngine.validateTransformation(value, transformation);
    
    let result = null;
    let error = null;
    
    if (isValid) {
      try {
        result = TransformationEngine.applyTransformation(value, transformation);
      } catch (e) {
        error = e instanceof Error ? e.message : 'Erro na transformação';
      }
    }

    return res.json({
      success: true,
      valid: isValid,
      input: value,
      output: result,
      transformation: transformation,
      error: error
    });

  } catch (error) {
    console.error('Erro ao validar transformação:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;
