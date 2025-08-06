import express from 'express';
import { GeminiMappingService } from '../services/GeminiMappingService';
import { SchemaManagerService } from '../services/SchemaManagerService';

const router = express.Router();

/**
 * POST /api/gemini/generate-mappings
 * Gera mapeamentos automáticos usando IA
 */
router.post('/generate-mappings', async (req, res) => {
  try {
    const { clientSchema, inputType = 'schema' } = req.body;
    
    if (!clientSchema) {
      return res.status(400).json({ error: 'clientSchema é obrigatório' });
    }

    const geminiService = new GeminiMappingService();
    const mappings = await geminiService.generateMappings(clientSchema, inputType);
    
    res.json({
      success: true,
      mappings,
      count: mappings.length,
      inputType
    });
  } catch (error) {
    console.error('Erro ao gerar mapeamentos:', error);
    res.status(500).json({ 
      error: `Failed to generate mappings: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

/**
 * GET /api/gemini/gupy-schema
 * Retorna o schema padrão da Gupy
 */
router.get('/gupy-schema', async (req, res) => {
  try {
    const schema = await SchemaManagerService.loadGupySchema();
    res.json(schema);
  } catch (error) {
    console.error('Error loading Gupy schema:', error);
    res.status(500).json({ 
      error: 'Erro ao carregar schema da Gupy' 
    });
  }
});

/**
 * GET /api/gemini/example-schemas
 * Retorna exemplos de schemas de clientes
 */
router.get('/example-schemas', async (req, res) => {
  try {
    const examples = await SchemaManagerService.loadExampleSchemas();
    res.json(examples);
  } catch (error) {
    console.error('Error loading example schemas:', error);
    res.status(500).json({ 
      error: 'Erro ao carregar exemplos de schemas' 
    });
  }
});

/**
 * GET /api/gemini/semantic-patterns
 * Retorna os padrões semânticos usados pela IA
 */
router.get('/semantic-patterns', async (req, res) => {
  try {
    const patterns = await SchemaManagerService.loadSemanticPatterns();
    res.json(patterns);
  } catch (error) {
    console.error('Error loading semantic patterns:', error);
    res.status(500).json({ 
      error: 'Erro ao carregar padrões semânticos' 
    });
  }
});

/**
 * POST /api/gemini/validate-schema
 * Valida um schema de cliente
 */
router.post('/validate-schema', async (req, res) => {
  try {
    const { schema } = req.body;

    if (!schema) {
      return res.status(400).json({ 
        error: 'Schema é obrigatório' 
      });
    }

    const validation = SchemaManagerService.validateClientSchema(schema);
    
    res.json({
      valid: validation.valid,
      errors: validation.errors,
      fieldPaths: validation.valid ? SchemaManagerService.extractFieldPaths(schema) : []
    });
  } catch (error) {
    console.error('Error validating schema:', error);
    res.status(500).json({ 
      error: 'Erro ao validar schema' 
    });
  }
});

export default router;
