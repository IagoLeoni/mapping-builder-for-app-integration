import express from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { CloudBuildService } from '../services/CloudBuildService';
import { IntegrationService } from '../services/IntegrationService';

const router = express.Router();

// Validation schema for deployment request
// ✅ VALIDAÇÃO FLEXIBILIZADA PARA EVITAR ERROS EM MAPEAMENTOS IA
const deploySchema = Joi.object({
  // NOVOS CAMPOS OBRIGATÓRIOS
  clientName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Client name must be at least 2 characters',
    'string.max': 'Client name cannot exceed 50 characters',
    'any.required': 'Client name is required'
  }),
  eventName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Event name must be at least 2 characters',
    'string.max': 'Event name cannot exceed 50 characters',
    'any.required': 'Event name is required'
  }),
  
  // CAMPOS EXISTENTES
  customerEmail: Joi.string().email().required(),
  systemEndpoint: Joi.string().uri().required(),
  mappings: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      sourceField: Joi.object().required(), // ✅ FLEXIBILIZADO - aceita qualquer estrutura
      targetPath: Joi.string().required(),
      // ✅ TODOS OS CAMPOS OPCIONAIS AGORA SÃO FLEXÍVEIS
      confidence: Joi.number().optional(),
      reasoning: Joi.string().optional(), 
      aiGenerated: Joi.boolean().optional(),
      transformation: Joi.any().optional() // ✅ ACEITA QUALQUER ESTRUTURA
    }).unknown(true) // ✅ PERMITE CAMPOS EXTRAS NÃO ESPECIFICADOS
  ).min(1).required(),
  systemPayload: Joi.object().required()
});

// FUNÇÕES DE NORMALIZAÇÃO (MESMAS DO FRONTEND)
function normalizeClientName(value: string): string {
  if (!value) return '';
  
  return value
    .toLowerCase()                    // Converte para lowercase
    .replace(/[^a-z0-9]/g, '')       // Remove TODOS caracteres especiais e espaços
    .replace(/^-+|-+$/g, '');        // Remove hífens das bordas
}

function normalizeEventName(value: string): string {
  if (!value) return '';
  
  return value
    .toLowerCase()                    // Converte para lowercase
    .replace(/\./g, '-')             // Substitui APENAS pontos por hífen
    .replace(/-+/g, '-')             // Remove hífens duplicados
    .replace(/^-+|-+$/g, '');        // Remove hífens das bordas
}

function generateIntegrationName(clientName: string, eventName: string): string {
  const normalizedClient = normalizeClientName(clientName);
  const normalizedEvent = normalizeEventName(eventName);
  
  // Validação adicional
  if (!normalizedClient || !normalizedEvent) {
    throw new Error('Client name and event name cannot be empty after normalization');
  }
  
  return `${normalizedClient}-${normalizedEvent}`;
}

/**
 * POST /api/deploy
 * Deploy a new integration to Google Cloud Application Integration
 */
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = deploySchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
      return;
    }

    const { clientName, eventName, customerEmail, systemEndpoint, mappings, systemPayload } = value;

    // GERAR NOME DA INTEGRAÇÃO PADRONIZADO
    const integrationName = generateIntegrationName(clientName, eventName);
    const integrationId = `int-${Date.now()}-${integrationName}`;

    console.log(`🏷️ Nome da integração gerado: ${integrationName}`);
    console.log(`🆔 ID da integração: ${integrationId}`);
    console.log(`👤 Cliente: "${clientName}" → "${normalizeClientName(clientName)}"`);
    console.log(`⚡ Evento: "${eventName}" → "${normalizeEventName(eventName)}"`);

    // Create integration JSON with transformations
    const integrationService = new IntegrationService();
    const integrationJson = integrationService.generateIntegrationWithTransformations({
      integrationId,
      integrationName,      // NOVO CAMPO
      clientName,           // NOVO CAMPO  
      eventName,            // NOVO CAMPO
      customerEmail,
      systemEndpoint,
      mappings,
      systemPayload
    });

    // Deploy to Google Cloud Application Integration
    const cloudBuildService = new CloudBuildService();
    const deploymentResult = await cloudBuildService.deployIntegration({
      integrationId,
      integrationName,      // NOVO CAMPO
      integrationJson,
      customerEmail
    });

    res.status(200).json({
      success: true,
      integrationId,
      integrationName,      // RETORNA NOME PADRONIZADO
      deploymentId: deploymentResult.deploymentId,
      status: deploymentResult.status,
      message: `Integration '${integrationName}' deployment initiated successfully`,
      endpoints: {
        trigger: deploymentResult.triggerUrl,
        status: `/api/integration/${integrationId}/status`
      },
      metadata: {
        clientName,
        eventName,
        normalizedClientName: normalizeClientName(clientName),
        normalizedEventName: normalizeEventName(eventName)
      }
    });

  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({
      error: 'Deployment failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/deploy/status/:deploymentId
 * Get deployment status
 */
router.get('/status/:deploymentId', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    
    const cloudBuildService = new CloudBuildService();
    const status = await cloudBuildService.getDeploymentStatus(deploymentId);

    res.status(200).json({
      deploymentId,
      status: status.status,
      logs: status.logs,
      updatedAt: status.updatedAt
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: 'Failed to get deployment status',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;
