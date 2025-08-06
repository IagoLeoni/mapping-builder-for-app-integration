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

/**
 * POST /api/gemini/payload-comparison
 * Gera mapeamentos usando equiparação de payloads
 */
router.post('/payload-comparison', async (req, res) => {
  try {
    const { gupyPayload, systemPayload } = req.body;

    if (!gupyPayload || !systemPayload) {
      return res.status(400).json({
        error: 'gupyPayload e systemPayload são obrigatórios'
      });
    }

    const geminiService = new GeminiMappingService();
    const mappings = await geminiService.generatePayloadComparisonMappings(gupyPayload, systemPayload);

    res.json({
      success: true,
      mappings,
      count: mappings.length,
      method: 'payload-comparison',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no endpoint payload-comparison:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Endpoint para geração de schema assistida por IA
router.post('/generate-schema', async (req, res) => {
  try {
    const { description, targetFormat = 'detailed_payload' } = req.body;
    
    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Descrição do sistema é obrigatória'
      });
    }
    
    console.log('🤖 Iniciando geração de schema assistida por IA...');
    console.log('📝 Descrição:', description);
    
    const geminiService = new GeminiMappingService();
    const schema = await geminiService.generateSchemaFromDescription(
      description.trim(),
      targetFormat
    );
    
    res.json({
      success: true,
      schema,
      description: description.trim(),
      targetFormat,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro no endpoint generate-schema:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor'
    });
  }
});

// Novo endpoint para carregar estrutura do payload Gupy para drag & drop
router.get('/gupy-payload-structure', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    console.log('📄 Carregando estrutura oficial do payload Gupy...');
    
    const schemaPath = path.join(__dirname, '../../../schemas/gupy/gupy-full-schema.json');
    
    if (!fs.existsSync(schemaPath)) {
      return res.status(404).json({
        success: false,
        error: 'Schema oficial da Gupy não encontrado'
      });
    }
    
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    const schema = JSON.parse(schemaContent);
    
    // Converter schema JSON Draft-07 para estrutura de payload
    const payloadStructure = convertSchemaToPayloadStructure(schema);
    
    console.log('✅ Estrutura do payload carregada com sucesso');
    
    res.json({
      success: true,
      payloadStructure,
      fieldCount: countFields(payloadStructure),
      source: 'gupy-full-schema.json'
    });
  } catch (error) {
    console.error('❌ Erro ao carregar estrutura do payload Gupy:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Função auxiliar para converter schema JSON Draft-07 em estrutura de payload
function convertSchemaToPayloadStructure(schema: any): any {
  console.log('🔄 Convertendo schema JSON Draft-07...');
  console.log('📋 Schema root keys:', Object.keys(schema));
  
  // O schema da Gupy tem estrutura: root.properties.body.properties.*
  // Precisamos extrair apenas o body.properties para o payload
  let targetSchema = schema;
  
  if (schema.properties && schema.properties.body && schema.properties.body.properties) {
    console.log('📦 Extraindo estrutura do body.properties...');
    targetSchema = schema.properties.body;
  }
  
  if (!targetSchema.properties) {
    console.warn('⚠️ Schema não possui properties, retornando estrutura vazia');
    return {};
  }
  
  console.log('🏗️ Processando properties:', Object.keys(targetSchema.properties));
  const structure = processSchemaProperties(targetSchema.properties);
  
  console.log('✅ Conversão concluída');
  return structure;
}

// Função recursiva para processar properties do schema
function processSchemaProperties(properties: any): any {
  const structure: any = {};
  
  for (const [key, value] of Object.entries(properties)) {
    const prop = value as any;
    
    if (prop.type === 'object' && prop.properties) {
      // Objeto aninhado - processar recursivamente
      structure[key] = processSchemaProperties(prop.properties);
    } else if (prop.type === 'array' && prop.items) {
      // Array - verificar se items tem properties (array de objetos)
      if (prop.items.properties) {
        structure[key] = processSchemaProperties(prop.items.properties);
      } else {
        structure[key] = 'array';
      }
    } else {
      // Tipo primitivo
      structure[key] = prop.type || 'string';
    }
  }
  
  return structure;
}

// Função auxiliar para contar campos
function countFields(obj: any, depth = 0): number {
  if (depth > 10 || typeof obj !== 'object' || obj === null) return 0;
  
  let count = 0;
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      count += countFields(value, depth + 1);
    } else {
      count += 1;
    }
  }
  return count;
}

export default router;
