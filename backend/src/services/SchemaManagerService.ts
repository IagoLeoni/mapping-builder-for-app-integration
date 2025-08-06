import * as fs from 'fs/promises';
import * as path from 'path';

export class SchemaManagerService {
  private static schemasPath = path.join(__dirname, '../../../schemas');

  /**
   * Carrega o schema padrão da Gupy
   */
  static async loadGupySchema(): Promise<any> {
    try {
      const schemaPath = path.join(__dirname, '../../../schemas/gupy/gupy-full-schema.json');
      const schemaContent = await fs.readFile(schemaPath, 'utf-8');
      return JSON.parse(schemaContent);
    } catch (error) {
      console.error('Erro ao carregar schema da Gupy:', error);
      throw new Error('Falha ao carregar schema da Gupy');
    }
  }

  /**
   * Carrega o payload de exemplo da Gupy
   */
  static async loadGupyExamplePayload(): Promise<any> {
    try {
      const payloadPath = path.join(__dirname, '../../../schemas/gupy/gupy-example-payload.json');
      const payloadContent = await fs.readFile(payloadPath, 'utf-8');
      return JSON.parse(payloadContent);
    } catch (error) {
      console.error('Erro ao carregar payload de exemplo da Gupy:', error);
      throw new Error('Falha ao carregar payload de exemplo da Gupy');
    }
  }

  /**
   * Carrega os padrões semânticos para IA
   */
  static async loadSemanticPatterns(): Promise<any> {
    try {
      const patternsPath = path.join(this.schemasPath, 'patterns/semantic-patterns.json');
      const content = await fs.readFile(patternsPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error loading semantic patterns:', error);
      throw new Error('Failed to load semantic patterns');
    }
  }

  /**
   * Carrega todos os exemplos de schemas de clientes
   */
  static async loadExampleSchemas(): Promise<any[]> {
    try {
      const examplesPath = path.join(this.schemasPath, 'examples');
      const files = await fs.readdir(examplesPath);
      
      const examples = [];
      for (const file of files.filter(f => f.endsWith('.json'))) {
        const content = await fs.readFile(path.join(examplesPath, file), 'utf-8');
        examples.push(JSON.parse(content));
      }
      
      return examples;
    } catch (error) {
      console.error('Error loading example schemas:', error);
      throw new Error('Failed to load example schemas');
    }
  }

  /**
   * Valida se um schema tem a estrutura mínima necessária
   */
  static validateClientSchema(schema: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!schema || typeof schema !== 'object') {
      errors.push('Schema deve ser um objeto JSON válido');
      return { valid: false, errors };
    }

    // Verificações básicas de estrutura
    if (Object.keys(schema).length === 0) {
      errors.push('Schema não pode estar vazio');
    }

    // Verificar se há campos aninhados muito profundos (>5 níveis)
    const checkDepth = (obj: any, depth = 0): number => {
      if (depth > 5) return depth;
      if (typeof obj !== 'object' || obj === null) return depth;
      
      let maxDepth = depth;
      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) {
          maxDepth = Math.max(maxDepth, checkDepth(value, depth + 1));
        }
      }
      return maxDepth;
    };

    const maxDepth = checkDepth(schema);
    if (maxDepth > 5) {
      errors.push('Schema muito profundo (máximo 5 níveis de aninhamento)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Extrai todos os caminhos de campos de um schema
   */
  static extractFieldPaths(schema: any, prefix = ''): string[] {
    const paths: string[] = [];

    const traverse = (obj: any, currentPath: string) => {
      if (typeof obj !== 'object' || obj === null) {
        if (currentPath) {
          paths.push(currentPath);
        }
        return;
      }

      for (const [key, value] of Object.entries(obj)) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Se o valor é um objeto, continua a travessia
          traverse(value, newPath);
        } else {
          // Se é um valor primitivo ou array, adiciona o caminho
          paths.push(newPath);
        }
      }
    };

    traverse(schema, prefix);
    return paths;
  }

  /**
   * Normaliza um schema para facilitar o processamento
   */
  static normalizeSchema(schema: any): any {
    const normalize = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(normalize);
      }

      const normalized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Normalizar chaves (remover caracteres especiais, converter para camelCase)
        const normalizedKey = key
          .replace(/[^a-zA-Z0-9_]/g, '_')
          .replace(/_+/g, '_')
          .replace(/^_|_$/g, '');

        normalized[normalizedKey] = normalize(value);
      }

      return normalized;
    };

    return normalize(schema);
  }
}
