export interface TransformationConfig {
  type: 'format_document' | 'concat' | 'split' | 'convert' | 'normalize' | 'format_date' | 'phone_split' | 'name_split' | 'country_code' | 'gender_code' | 'code_lookup';
  operation: string;
  pattern?: string;
  parameters?: any;
  mapping?: Record<string, string>;
  separator?: string;
  inputFormat?: string;
  outputFormat?: string;
  preview?: {
    input: string;
    output: string;
  };
}

export class TransformationEngine {
  /**
   * Aplica uma transformação a um valor
   */
  static applyTransformation(value: any, transformation: TransformationConfig): any {
    if (!transformation || value === null || value === undefined) {
      return value;
    }

    try {
      switch (transformation.type) {
        case 'format_document':
          return this.formatDocument(value, transformation);
        case 'concat':
          return this.concatenateFields(value, transformation);
        case 'split':
        case 'phone_split':
        case 'name_split':
          return this.splitField(value, transformation);
        case 'convert':
          return this.convertType(value, transformation);
        case 'normalize':
          return this.normalizeCase(value, transformation);
        case 'format_date':
          return this.formatDate(value, transformation);
        case 'country_code':
          return this.convertCountryCode(value, transformation);
        case 'gender_code':
          return this.convertGenderCode(value, transformation);
        case 'code_lookup':
          return this.lookupCode(value, transformation);
        default:
          console.warn(`Tipo de transformação não suportado: ${transformation.type}`);
          return value;
      }
    } catch (error) {
      console.error(`Erro ao aplicar transformação ${transformation.type}:`, error);
      return value; // Retorna valor original em caso de erro
    }
  }

  /**
   * Formatação de documentos (CPF, CNPJ, telefone, etc.)
   */
  private static formatDocument(value: string, config: TransformationConfig): string {
    if (typeof value !== 'string') return value;

    switch (config.pattern) {
      case 'cpf':
        // Remove pontos, hífens e espaços
        return value.replace(/[.\-\s]/g, '');
      case 'cnpj':
        // Remove pontos, hífens, barras e espaços
        return value.replace(/[.\-\/\s]/g, '');
      case 'phone':
        // Remove espaços, hífens, parênteses e símbolos
        return value.replace(/[\s\-\(\)\+]/g, '');
      case 'cep':
        // Remove hífens e espaços
        return value.replace(/[\-\s]/g, '');
      default:
        return value.replace(/[.\-\s]/g, ''); // Formatação genérica
    }
  }

  /**
   * Concatenação de campos
   */
  private static concatenateFields(values: string[], config: TransformationConfig): string {
    if (!Array.isArray(values)) return values;
    
    const separator = config.separator || ' ';
    return values.filter(v => v && v.trim()).join(separator);
  }

  /**
   * Divisão de campos
   */
  private static splitField(value: string, config: TransformationConfig): any {
    if (typeof value !== 'string') return value;

    switch (config.operation) {
      case 'phone_split':
      case 'split_country_code_area_code':
      case 'extract_area_code':
        return this.splitPhone(value, config);
      case 'name_split':
      case 'split_first_name':
      case 'split_last_name':
        return this.splitName(value, config);
      default:
        return value;
    }
  }

  /**
   * Divisão de telefone
   */
  private static splitPhone(value: string, config: TransformationConfig): any {
    // Padrões para telefone brasileiro: +5511999999999, (11)99999-9999, 11999999999
    const patterns = [
      /^\+55(\d{2})(\d{8,9})$/, // +5511999999999
      /^\+(\d{2})(\d{2})(\d{8,9})$/, // +551199999999
      /^\((\d{2})\)(\d{8,9})$/, // (11)999999999
      /^(\d{2})(\d{8,9})$/ // 11999999999
    ];

    for (const pattern of patterns) {
      const match = value.replace(/[\s\-]/g, '').match(pattern);
      if (match) {
        if (config.operation === 'extract_area_code') {
          return match[1] || match[2]; // Retorna apenas código de área
        }
        
        return {
          countryCode: match[1] === '55' ? '55' : match[1],
          areaCode: match[1] === '55' ? match[2] : match[2],
          phoneNumber: match[1] === '55' ? match[3] : match[3]
        };
      }
    }

    return value; // Se não conseguir fazer parse, retorna original
  }

  /**
   * Divisão de nome
   */
  private static splitName(value: string, config: TransformationConfig): string {
    if (typeof value !== 'string') return value;

    const parts = value.trim().split(/\s+/);
    
    switch (config.operation) {
      case 'split_first_name':
        return parts[0] || '';
      case 'split_last_name':
        return parts.slice(1).join(' ') || '';
      default:
        return value;
    }
  }

  /**
   * Conversão de tipos
   */
  private static convertType(value: any, config: TransformationConfig): any {
    switch (config.operation) {
      case 'string_to_number':
        const num = parseFloat(value);
        return isNaN(num) ? value : num;
      case 'number_to_string':
        return String(value);
      case 'string_to_boolean':
        return ['true', '1', 'yes', 'sim'].includes(String(value).toLowerCase());
      case 'boolean_to_string':
        return String(value);
      default:
        return value;
    }
  }

  /**
   * Normalização de texto
   */
  private static normalizeCase(value: string, config: TransformationConfig): string {
    if (typeof value !== 'string') return value;

    switch (config.operation) {
      case 'upper_case':
        return value.toUpperCase();
      case 'lower_case':
        return value.toLowerCase();
      case 'title_case':
        return value.replace(/\w\S*/g, txt => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
      case 'remove_accents':
        return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      default:
        return value;
    }
  }

  /**
   * Formatação de datas
   */
  private static formatDate(value: string, config: TransformationConfig): string {
    if (!value) return value;

    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return value;

      switch (config.outputFormat) {
        case 'dd/MM/yyyy':
          return date.toLocaleDateString('pt-BR');
        case 'yyyy-MM-dd':
          return date.toISOString().split('T')[0];
        case 'MM/dd/yyyy':
          return date.toLocaleDateString('en-US');
        case 'ISO':
          return date.toISOString();
        default:
          return value;
      }
    } catch (error) {
      return value;
    }
  }

  /**
   * Conversão de códigos de país
   */
  private static convertCountryCode(value: string, config: TransformationConfig): string {
    if (!config.mapping) return value;
    return config.mapping[value] || value;
  }

  /**
   * Conversão de códigos de gênero
   */
  private static convertGenderCode(value: string, config: TransformationConfig): string {
    if (!config.mapping) return value;
    return config.mapping[value] || value;
  }

  /**
   * Lookup de códigos
   */
  private static lookupCode(value: string, config: TransformationConfig): string {
    if (!config.mapping) return value;
    return config.mapping[value] || value;
  }

  /**
   * Aplica múltiplas transformações em sequência
   */
  static applyTransformations(value: any, transformations: TransformationConfig[]): any {
    return transformations.reduce((currentValue, transformation) => {
      return this.applyTransformation(currentValue, transformation);
    }, value);
  }

  /**
   * Valida se uma transformação pode ser aplicada a um valor
   */
  static validateTransformation(value: any, transformation: TransformationConfig): boolean {
    try {
      this.applyTransformation(value, transformation);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gera preview de uma transformação
   */
  static generatePreview(value: any, transformation: TransformationConfig): { input: string; output: string } {
    const input = String(value);
    const output = String(this.applyTransformation(value, transformation));
    
    return { input, output };
  }
}
