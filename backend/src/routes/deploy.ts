import express from 'express';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import { CloudBuildService } from '../services/CloudBuildService';
import { IntegrationService } from '../services/IntegrationService';

const router = express.Router();

// Validation schema for deployment request
const deploySchema = Joi.object({
  customerEmail: Joi.string().email().required(),
  systemEndpoint: Joi.string().uri().required(),
  mappings: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      sourceField: Joi.object({
        id: Joi.string().required(),
        name: Joi.string().required(),
        type: Joi.string().valid('string', 'number', 'boolean', 'object', 'array').required(),
        path: Joi.string().required()
      }).required(),
      targetPath: Joi.string().required(),
      transformation: Joi.object({
        type: Joi.string().required(),
        operation: Joi.string().optional(),
        pattern: Joi.string().optional(),
        parameters: Joi.any().optional(),
        mapping: Joi.object().optional(),
        separator: Joi.string().optional(),
        inputFormat: Joi.string().optional(),
        outputFormat: Joi.string().optional(),
        preview: Joi.object({
          input: Joi.string().required(),
          output: Joi.string().required()
        }).optional()
      }).optional()
    })
  ).min(1).required(),
  systemPayload: Joi.object().required()
});

/**
 * POST /api/deploy
 * Deploy a new integration to Google Cloud Application Integration
 */
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = deploySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    const { customerEmail, systemEndpoint, mappings, systemPayload } = value;

    // Generate unique integration ID
    const integrationId = `int-${Date.now()}-${uuidv4().substring(0, 8)}`;

    // Create integration JSON with transformations
    const integrationService = new IntegrationService();
    const integrationJson = integrationService.generateIntegrationWithTransformations({
      integrationId,
      customerEmail,
      systemEndpoint,
      mappings,
      systemPayload
    });

    // Deploy to Google Cloud Application Integration
    const cloudBuildService = new CloudBuildService();
    const deploymentResult = await cloudBuildService.deployIntegration({
      integrationId,
      integrationJson,
      customerEmail
    });

    res.status(200).json({
      success: true,
      integrationId,
      deploymentId: deploymentResult.deploymentId,
      status: deploymentResult.status,
      message: 'Integration deployment initiated successfully',
      endpoints: {
        trigger: deploymentResult.triggerUrl,
        status: `/api/integration/${integrationId}/status`
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
