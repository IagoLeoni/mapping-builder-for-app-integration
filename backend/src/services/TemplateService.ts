import * as fs from 'fs';
import * as path from 'path';
import { TransformationEngine, TransformationConfig } from './TransformationEngine';

export class TemplateService {
  private static templatesPath = path.join(__dirname, '../../../templates');

  // Método removido - sistema agora usa implementações hardcoded
  // private static loadTemplate(templatePath: string): string { ... }

  // Substituir placeholders no template
  private static replacePlaceholders(template: string, replacements: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      const quotedPlaceholder = `"{{${key}}}"`;
      const unquotedPlaceholder = `{{${key}}}`;
      let replacement: string;
      
      if (typeof value === 'string') {
        // Se já é uma string JSON válida (array ou objeto), usar sem aspas
        if (value.startsWith('[') || value.startsWith('{')) {
          replacement = value;
          // Para arrays/objetos, usar o placeholder sem aspas
          result = result.replace(new RegExp(quotedPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
        } else {
          // Para strings simples, manter as aspas
          replacement = JSON.stringify(value);
          result = result.replace(new RegExp(quotedPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
        }
      } else {
        // Para outros tipos (arrays, objetos), serializar como JSON sem aspas extras
        replacement = JSON.stringify(value);
        result = result.replace(new RegExp(quotedPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
      }
    }
    return result;
  }

  // Gerar integração com transformações automáticas
  static generateIntegrationWithTransformations(config: {
    integrationName: string;
    customerEmail: string;
    systemEndpoint: string;
    mappings: Array<{
      sourceField: { path: string; type: string; name: string };
      targetPath: string;
      confidence?: number;
      transformation?: TransformationConfig;
    }>;
  }): any {
    // Aplicar transformações automaticamente no systemPayload
    const transformedPayload = this.applyTransformationsToPayload(config.mappings);
    
    return this.generateIntegration({
      integrationName: config.integrationName,
      customerEmail: config.customerEmail,
      systemEndpoint: config.systemEndpoint,
      systemPayload: transformedPayload,
      transformationTasks: this.generateTransformationTasks(config.mappings),
      transformationVariables: []
    });
  }

  // Gerar integração completa (versão hardcoded para evitar problemas de template)
  static generateIntegration(config: {
    integrationName: string;
    customerEmail: string;
    systemEndpoint: string;
    systemPayload: any;
    transformationTasks: any[];
    transformationVariables: any[];
  }): any {
    console.log(`🔍 TemplateService.generateIntegration chamado com:`);
    console.log(`  📧 customerEmail: "${config.customerEmail}"`);
    console.log(`  📧 customerEmail type: ${typeof config.customerEmail}`);
    console.log(`  📧 customerEmail empty?: ${!config.customerEmail}`);
    console.log(`  📧 customerEmail length: ${config.customerEmail?.length || 0}`);
    console.log(`  🔗 systemEndpoint: "${config.systemEndpoint}"`);
    console.log(`  🏷️ integrationName: "${config.integrationName}"`);
    console.log(`  🔍 Full config:`, JSON.stringify(config, null, 2));
    
    const timestamp = new Date().toISOString();
    const integrationId = `int-${Date.now()}`;
    const versionId = this.generateUUID();
    
    // Usar integrationName para trigger ID (mesmo nome da integração)
    const triggerName = config.integrationName || integrationId;
    
    console.log(`🏷️ Usando integrationName para trigger: "${triggerName}"`);
    
    // Gerar tarefas usando métodos diretos - sem JsonnetMapperTask separado
    const taskConfigs = [
      ...config.transformationTasks,
      this.generateFieldMappingTask(config.customerEmail),
      this.generateRestTask(),
      this.generatePubSubTask(),
      this.generateSuccessOutputTaskHardcoded()
    ];

    // Determinar tarefas iniciais 
    const startTasks = config.transformationTasks.length > 0 
      ? config.transformationTasks.map(task => ({ "taskId": task.taskId }))
      : [{ "taskId": "1" }];

    // Retornar JSON direto sem usar templates
    return {
      "name": `projects/160372229474/locations/us-central1/integrations/${integrationId}/versions/${versionId}`,
      "updateTime": timestamp,
      "createTime": timestamp,
      "triggerConfigs": [{
        "label": "API Trigger",
        "startTasks": startTasks,
        "properties": {
          "Trigger name": triggerName
        },
        "triggerType": "API",
        "triggerNumber": "2",
        "triggerId": `api_trigger/${triggerName}`,
        "position": { "x": 140, "y": 45 },
        "inputVariables": {},
        "outputVariables": {
          "names": ["Output"]
        }
      }],
      "taskConfigs": taskConfigs,
      "integrationParameters": [
        {
          "key": "Output",
          "dataType": "JSON_VALUE",
          "defaultValue": {
            "jsonValue": JSON.stringify({ "Status": "Success" })
          },
          "displayName": "Output",
          "inputOutputType": "OUT"
        },
        {
          "key": "systemPayload",
          "dataType": "JSON_VALUE",
          "defaultValue": {},
          "displayName": "systemPayload"
        },
        {
          "key": "customerEmail",
          "dataType": "STRING_VALUE",
          "defaultValue": {
            "stringValue": config.customerEmail || "admin@example.com"
          },
          "displayName": "customerEmail"
        },
        {
          "key": "systemEndpoint",
          "dataType": "STRING_VALUE",
          "defaultValue": {},
          "displayName": "systemEndpoint"
        },
        {
          "key": "sourceSystemPayload",
          "dataType": "JSON_VALUE",
          "defaultValue": {
            "jsonValue": "{\n  \"companyName\": \"Example Company\",\n  \"event\": \"employee.hired\",\n  \"id\": \"12345678-abcd-1234-abcd-123456789012\",\n  \"date\": \"2025-01-15T10:30:00.000Z\",\n  \"employee\": {\n    \"id\": \"EMP001\",\n    \"personalInfo\": {\n      \"name\": \"John\",\n      \"lastName\": \"Doe\",\n      \"email\": \"john.doe@company.com\",\n      \"identificationDocument\": \"123.456.789-00\",\n      \"birthdate\": \"1990-05-15\",\n      \"gender\": \"Male\",\n      \"nationality\": \"Brazil\"\n    },\n    \"contactInfo\": {\n      \"mobileNumber\": \"+5511999999999\",\n      \"phoneNumber\": \"+5511888888888\",\n      \"address\": {\n        \"street\": \"Main Street\",\n        \"number\": \"123\",\n        \"city\": \"São Paulo\",\n        \"state\": \"São Paulo\",\n        \"zipCode\": \"01000-000\",\n        \"country\": \"Brasil\"\n      }\n    },\n    \"jobInfo\": {\n      \"department\": {\n        \"code\": \"TECH001\",\n        \"name\": \"Technology\"\n      },\n      \"role\": {\n        \"code\": \"DEV001\",\n        \"name\": \"Software Developer\"\n      },\n      \"hiringDate\": \"2025-01-15T00:00:00.000Z\",\n      \"salary\": {\n        \"value\": 5000.0,\n        \"currency\": \"BRL\"\n      }\n    }\n  }\n}"
          },
          "displayName": "sourceSystemPayload",
          "inputOutputType": "IN"
        },
        {
          "key": "pubsub_message_string",
          "dataType": "STRING_VALUE",
          "defaultValue": {},
          "displayName": "pubsub_message_string"
        },
        {
          "key": "`Task_4_connectorInputPayload`",
          "dataType": "JSON_VALUE",
          "displayName": "`Task_4_connectorInputPayload`",
          "producer": "1_4",
          "jsonSchema": "{\n  \"$schema\": \"http://json-schema.org/draft-07/schema#\",\n  \"type\": \"object\",\n  \"properties\": {\n    \"message\": {\n      \"type\": \"string\",\n      \"description\": \"Message to publish to Cloud PubSub.\"\n    },\n    \"topic\": {\n      \"type\": \"string\",\n      \"description\": \"Topic of Cloud PubSub.\"\n    },\n    \"attributes\": {\n      \"type\": [\"string\", \"null\"],\n      \"description\": \"Custom attributes as metadata in pub/sub messages.\"\n    }\n  },\n  \"required\": [\"message\", \"topic\"]\n}"
        },
        {
          "key": "`Task_4_connectorOutputPayload`",
          "dataType": "JSON_VALUE",
          "displayName": "`Task_4_connectorOutputPayload`",
          "isTransient": true,
          "producer": "1_4",
          "jsonSchema": "{\n  \"type\": \"array\",\n  \"$schema\": \"http://json-schema.org/draft-07/schema#\",\n  \"items\": {\n    \"type\": \"object\",\n    \"properties\": {\n      \"messageId\": {\n        \"type\": \"string\",\n        \"description\": \"Message ID of the published message.\"\n      }\n    },\n    \"$schema\": \"http://json-schema.org/draft-07/schema#\"\n  }\n}"
        },
        ...config.transformationVariables
      ],
      "errorCatcherConfigs": [],
      "integrationConfigParameters": [
        {
          "parameter": {
            "key": "`CONFIG_systemPayload`",
            "dataType": "JSON_VALUE",
            "defaultValue": {
              "jsonValue": JSON.stringify(config.systemPayload)
            },
            "displayName": "`CONFIG_systemPayload`"
          }
        },
        {
          "parameter": {
            "key": "`CONFIG_systemEndpoint`",
            "dataType": "STRING_VALUE",
            "defaultValue": {
              "stringValue": config.systemEndpoint || ""
            },
            "displayName": "`CONFIG_systemEndpoint`"
          }
        }
      ]
    };
  }

  // Gerar tarefa de mapeamento de campos
  private static generateFieldMappingTask(customerEmail: string): any {
    // Retornar objeto hardcoded para evitar problemas de template
    return {
      "task": "FieldMappingTask",
      "taskId": "1",
      "parameters": {
        "FieldMappingConfigTaskParameterKey": {
          "key": "FieldMappingConfigTaskParameterKey",
          "value": {
            "jsonValue": JSON.stringify({
              "@type": "type.googleapis.com/enterprise.crm.eventbus.proto.FieldMappingConfig",
              "mappedFields": [
                {
                  "inputField": {
                    "fieldType": "JSON_VALUE",
                    "transformExpression": {
                      "initialValue": {
                        "referenceValue": "$`CONFIG_systemPayload`$"
                      },
                      "transformationFunctions": [{
                        "functionType": {
                          "jsonFunction": {
                            "functionName": "RESOLVE_TEMPLATE"
                          }
                        }
                      }]
                    }
                  },
                  "outputField": {
                    "referenceKey": "$systemPayload$",
                    "fieldType": "JSON_VALUE",
                    "cardinality": "OPTIONAL"
                  }
                },
                {
                  "inputField": {
                    "fieldType": "STRING_VALUE",
                    "transformExpression": {
                      "initialValue": {
                        "referenceValue": "$`CONFIG_systemEndpoint`$"
                      }
                    }
                  },
                  "outputField": {
                    "referenceKey": "$systemEndpoint$",
                    "fieldType": "STRING_VALUE",
                    "cardinality": "OPTIONAL"
                  }
                },
                {
                  "inputField": {
                    "fieldType": "STRING_VALUE",
                    "transformExpression": {
                      "initialValue": {
                        "literalValue": {
                          "stringValue": customerEmail || "admin@example.com"
                        }
                      }
                    }
                  },
                  "outputField": {
                    "referenceKey": "$customerEmail$",
                    "fieldType": "STRING_VALUE",
                    "cardinality": "OPTIONAL"
                  }
                },
                {
                  "inputField": {
                    "fieldType": "STRING_VALUE",
                    "transformExpression": {
                      "initialValue": {
                        "literalValue": {
                          "stringValue": "dlq-pre-employee-moved"
                        }
                      }
                    }
                  },
                  "outputField": {
                    "referenceKey": "$`Task_4_connectorInputPayload`.topic$",
                    "fieldType": "STRING_VALUE",
                    "cardinality": "OPTIONAL"
                  }
                },
                {
                  "inputField": {
                    "fieldType": "JSON_VALUE",
                    "transformExpression": {
                      "initialValue": {
                        "referenceValue": "$systemPayload$"
                      },
                      "transformationFunctions": [{
                        "functionType": {
                          "stringFunction": {
                            "functionName": "TO_JSON"
                          }
                        }
                      }]
                    }
                  },
                  "outputField": {
                    "referenceKey": "$`Task_4_connectorInputPayload`.message$",
                    "fieldType": "STRING_VALUE",
                    "cardinality": "OPTIONAL"
                  }
                }
              ]
            })
          }
        }
      },
      "nextTasks": [{ "taskId": "2" }],
      "taskExecutionStrategy": "WHEN_ALL_SUCCEED",
      "displayName": "Data Mapping",
      "externalTaskType": "NORMAL_TASK",
      "position": { "x": "140", "y": "181" }
    };
  }

  // Gerar tarefa REST (versão hardcoded para evitar problemas de parsing)
  private static generateRestTask(): any {
    return {
      "task": "GenericRestV2Task",
      "taskId": "2",
      "parameters": {
        "throwError": {
          "key": "throwError",
          "value": {
            "booleanValue": true
          }
        },
        "responseBody": {
          "key": "responseBody",
          "value": {
            "stringArray": {
              "stringValues": ["$`Task_2_responseBody`$"]
            }
          }
        },
        "disableSSLValidation": {
          "key": "disableSSLValidation",
          "value": {
            "booleanValue": false
          }
        },
        "httpParams": {
          "key": "httpParams"
        },
        "authConfigName": {
          "key": "authConfigName",
          "value": {
            "stringValue": ""
          }
        },
        "responseHeader": {
          "key": "responseHeader",
          "value": {
            "stringArray": {
              "stringValues": ["$`Task_2_responseHeader`$"]
            }
          }
        },
        "userAgent": {
          "key": "userAgent",
          "value": {
            "stringValue": ""
          }
        },
        "httpMethod": {
          "key": "httpMethod",
          "value": {
            "stringValue": "POST"
          }
        },
        "responseStatus": {
          "key": "responseStatus",
          "value": {
            "stringArray": {
              "stringValues": ["$`Task_2_responseStatus`$"]
            }
          }
        },
        "timeout": {
          "key": "timeout",
          "value": {
            "intValue": "0"
          }
        },
        "url": {
          "key": "url",
          "value": {
            "stringValue": "$systemEndpoint$"
          }
        },
        "useSSL": {
          "key": "useSSL",
          "value": {
            "booleanValue": false
          }
        },
        "urlFetchingService": {
          "key": "urlFetchingService",
          "value": {
            "stringValue": "HARPOON"
          }
        },
        "urlQueryStrings": {
          "key": "urlQueryStrings"
        },
        "requestorId": {
          "key": "requestorId",
          "value": {
            "stringValue": ""
          }
        },
        "jsonAdditionalHeaders": {
          "key": "jsonAdditionalHeaders",
          "value": {
            "jsonValue": JSON.stringify({
              "Content-Type": "application/json",
              "X-Integration-Source": "iPaaS-Builder"
            })
          }
        },
        "requestBody": {
          "key": "requestBody",
          "value": {
            "stringValue": "$systemPayload$"
          }
        },
        "followRedirects": {
          "key": "followRedirects",
          "value": {
            "booleanValue": true
          }
        },
        "additionalHeaders": {
          "key": "additionalHeaders"
        }
      },
      "nextTasks": [
        { "taskId": "5", "condition": "$`Task_2_responseStatus`$ = \"200 OK\"" },
        { "taskId": "4", "condition": "$`Task_2_responseStatus`$ != \"200 OK\"" }
      ],
      "taskExecutionStrategy": "WHEN_ANY_SUCCEED",
      "displayName": "Call Customer Endpoint",
      "externalTaskType": "NORMAL_TASK",
      "position": { "x": "140", "y": "317" },
      "conditionalFailurePolicies": {
        "defaultFailurePolicy": {
          "retryStrategy": "IGNORE"
        }
      }
    };
  }

  // Gerar tarefa PubSub (substitui EmailTask)
  private static generatePubSubTask(): any {
    console.log(`📨 Gerando PubSubTask para dlq-pre-employee-moved`);
    
    return {
      "task": "GenericConnectorTask",
      "taskId": "4",
      "parameters": {
        "connectorInputPayload": {
          "key": "connectorInputPayload",
          "value": {
            "stringValue": "$`Task_4_connectorInputPayload`$"
          }
        },
        "authOverrideEnabled": {
          "key": "authOverrideEnabled",
          "value": {
            "booleanValue": false
          }
        },
        "connectionName": {
          "key": "connectionName",
          "value": {
            "stringValue": "projects/apigee-prd1/locations/us-central1/connections/pubsub-poc"
          }
        },
        "connectorOutputPayload": {
          "key": "connectorOutputPayload",
          "value": {
            "stringValue": "$`Task_4_connectorOutputPayload`$"
          }
        },
        "operation": {
          "key": "operation",
          "value": {
            "stringValue": "EXECUTE_ACTION"
          }
        },
        "connectionVersion": {
          "key": "connectionVersion",
          "value": {
            "stringValue": "projects/apigee-prd1/locations/global/providers/gcp/connectors/pubsub/versions/1"
          }
        },
        "actionName": {
          "key": "actionName",
          "value": {
            "stringValue": "publishMessage"
          }
        }
      },
      "nextTasks": [],
      "taskExecutionStrategy": "WHEN_ALL_SUCCEED",
      "displayName": "Publish to PubSub DLQ",
      "externalTaskType": "NORMAL_TASK",
      "position": { "x": "620", "y": "181" }
    };
  }

  // Gerar JsonnetMapperTask para converter JSON em string para PubSub
  private static generateJsonToStringMapperTask(): any {
    console.log(`🔧 Gerando JsonnetMapperTask para conversão JSON → String`);
    
    return {
      "task": "JsonnetMapperTask",
      "taskId": "14",
      "parameters": {
        "template": {
          "key": "template",
          "value": {
            "stringValue": "local sourceSystemPayload = std.extVar(\"sourceSystemPayload\"); local systemPayload = std.extVar(\"systemPayload\"); { pubsub_message_string: std.manifestJsonEx(systemPayload, \"    \") }"
          }
        }
      },
      "nextTasks": [{ "taskId": "1" }],
      "taskExecutionStrategy": "WHEN_ALL_SUCCEED",
      "displayName": "Convert JSON to String for PubSub",
      "externalTaskType": "NORMAL_TASK",
      "position": { "x": "140", "y": "120" }
    };
  }

  // Gerar tarefa de output de sucesso (versão hardcoded)
  private static generateSuccessOutputTaskHardcoded(): any {
    return {
      "task": "FieldMappingTask",
      "taskId": "5",
      "parameters": {
        "FieldMappingConfigTaskParameterKey": {
          "key": "FieldMappingConfigTaskParameterKey",
          "value": {
            "jsonValue": JSON.stringify({
              "@type": "type.googleapis.com/enterprise.crm.eventbus.proto.FieldMappingConfig",
              "mappedFields": [{
                "inputField": {
                  "fieldType": "JSON_VALUE",
                  "transformExpression": {
                    "initialValue": {
                      "referenceValue": "$Output$"
                    }
                  }
                },
                "outputField": {
                  "referenceKey": "$Output$",
                  "fieldType": "JSON_VALUE",
                  "cardinality": "OPTIONAL"
                }
              }]
            })
          }
        }
      },
      "nextTasks": [],
      "taskExecutionStrategy": "WHEN_ALL_SUCCEED",
      "displayName": "Success Output",
      "externalTaskType": "NORMAL_TASK",
      "position": { "x": "146", "y": "504" }
    };
  }

  // Métodos removidos - sistema agora usa apenas implementações hardcoded
  // Estes métodos tentavam carregar templates de arquivos que foram removidos

  // Gerar tarefa JsonnetMapperTask (versão hardcoded)
  static generateJsonnetMapperTask(
    taskId: string,
    jsonnetTemplate: string,
    displayName: string,
    positionX: number,
    positionY: number
  ): any {
    console.log(`🔧 Gerando JsonnetMapperTask hardcoded - taskId: ${taskId}, displayName: ${displayName}`);
    
    // Retornar objeto hardcoded para evitar problemas de template
    return {
      "task": "JsonnetMapperTask",
      "taskId": taskId,
      "parameters": {
        "template": {
          "key": "template",
          "value": {
            "stringValue": jsonnetTemplate
          }
        }
      },
      "nextTasks": [{ "taskId": "1" }],
      "taskExecutionStrategy": "WHEN_ALL_SUCCEED",
      "displayName": displayName,
      "externalTaskType": "NORMAL_TASK",
      "position": { 
        "x": positionX.toString(), 
        "y": positionY.toString() 
      }
    };
  }

  // Gerar UUID simples
  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Aplicar transformações automaticamente no payload
  private static applyTransformationsToPayload(mappings: Array<{
    sourceField: { path: string; type: string; name: string };
    targetPath: string;
    confidence?: number;
    transformation?: TransformationConfig;
  }>): any {
    const transformedPayload: any = {};
    
    // Payload de exemplo genérico para aplicar transformações (mantendo compatibilidade com estrutura existente)
    const sourceSystemExamplePayload = {
      companyName: "Example Company",
      event: "employee.hired",
      id: "12345678-abcd-1234-abcd-123456789012", 
      date: "2025-01-15T10:30:00.000Z",
      employee: {
        id: "EMP001",
        personalInfo: {
          name: "John",
          lastName: "Doe",
          email: "john.doe@company.com",
          identificationDocument: "123.456.789-00",
          birthdate: "1990-05-15",
          gender: "Male",
          nationality: "Brazil"
        },
        contactInfo: {
          mobileNumber: "+5511999999999",
          phoneNumber: "+5511888888888",
          address: {
            street: "Main Street",
            number: "123",
            city: "São Paulo",
            state: "São Paulo",
            zipCode: "01000-000",
            country: "Brasil"
          }
        },
        jobInfo: {
          department: {
            code: "TECH001",
            name: "Technology"
          },
          role: {
            code: "DEV001", 
            name: "Software Developer"
          },
          hiringDate: "2025-01-15T00:00:00.000Z",
          salary: {
            value: 5000.0,
            currency: "BRL"
          }
        }
      }
    };

    for (const mapping of mappings) {
      try {
        // Obter valor do campo fonte
        const sourceValue = this.getValueByPath(sourceSystemExamplePayload, mapping.sourceField.path);
        
        if (sourceValue !== undefined) {
          let transformedValue = sourceValue;
          
          // Aplicar transformação apenas se confiança ≥80%
          if (mapping.transformation && (mapping.confidence || 0) >= 80) {
            transformedValue = TransformationEngine.applyTransformation(sourceValue, mapping.transformation);
            console.log(`🔄 Transformação aplicada (confiança ${mapping.confidence}%): ${mapping.sourceField.path} -> ${mapping.targetPath}`, {
              original: sourceValue,
              transformed: transformedValue,
              transformation: mapping.transformation.type
            });
          } else if (mapping.transformation && (mapping.confidence || 0) < 80) {
            console.log(`⚠️ Transformação ignorada (confiança ${mapping.confidence}% < 80%): ${mapping.sourceField.path} -> ${mapping.targetPath}`);
          }
          
          // Definir valor no payload transformado
          this.setValueByPath(transformedPayload, mapping.targetPath, transformedValue);
        }
      } catch (error) {
        console.warn(`Erro ao aplicar transformação para ${mapping.sourceField.path}:`, error);
      }
    }

    return transformedPayload;
  }

  // Gerar tarefas de transformação baseadas nos mapeamentos
  private static generateTransformationTasks(mappings: Array<{
    sourceField: { path: string; type: string; name: string };
    targetPath: string;
    confidence?: number;
    transformation?: TransformationConfig;
  }>): any[] {
    const transformationTasks: any[] = [];
    let taskIdCounter = 10;

    // Filtrar apenas mapeamentos com transformações
    const transformationMappings = mappings.filter(m => m.transformation && m.transformation.type);

    for (const mapping of transformationMappings) {
      try {
        // ✅ USAR TASKID NO NOME DA VARIÁVEL PARA GARANTIR UNICIDADE
        const varName = this.generateVariableName(mapping.sourceField.name, taskIdCounter);
        const inputPath = this.generateJsonnetPath(mapping.sourceField.path);
        
        // Gerar template Jsonnet AUTO-CONTIDO (sem imports externos)
        const jsonnetTemplate = this.generateInlineJsonnetTemplate(
          inputPath,
          varName,
          mapping.transformation!
        );

        // Criar tarefa usando o método público
        const task = this.generateJsonnetMapperTask(
          taskIdCounter.toString(),
          jsonnetTemplate,
          `Transform ${mapping.sourceField.name} (${mapping.transformation!.type})`,
          140 + (taskIdCounter - 10) * 200,
          100
        );

        transformationTasks.push(task);
        taskIdCounter++;
        
        console.log(`✅ Gerada tarefa Jsonnet para ${mapping.sourceField.name}: ${mapping.transformation!.type} - varName: ${varName}`);
      } catch (error) {
        console.error(`❌ Erro ao gerar tarefa para ${mapping.sourceField.name}:`, error);
      }
    }

    console.log(`📝 Geradas ${transformationTasks.length} tarefas de transformação Jsonnet`);
    return transformationTasks;
  }

  // Mapear tipo de transformação para função da biblioteca
  private static getTransformationFunction(transformation: TransformationConfig): string {
    switch (transformation.type) {
      case 'format_document': return 'formatDocument';
      case 'phone_split': return 'splitPhone';
      case 'name_split': return 'splitName';
      case 'normalize': return 'normalizeCase';
      case 'country_code': return 'convertCountryCode';
      case 'gender_code': return 'convertGenderCode';
      case 'code_lookup': return 'lookupCode';
      case 'concat': return 'concat';
      case 'split': return 'splitString';
      case 'convert': return 'convertType';
      case 'format_date': return 'formatDate';
      default: return 'identity';
    }
  }

  // Gerar nome de variável para transformação com garantia de unicidade
  private static generateVariableName(fieldName: string, uniqueId?: number): string {
    const normalizedName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const suffix = uniqueId ? `_${uniqueId}` : '';
    return `transformed_mapping_${normalizedName}${suffix}`;
  }

  // Gerar path Jsonnet para sistema fonte genérico
  private static generateJsonnetPath(fieldPath: string): string {
    const pathParts = fieldPath.split('.');
    let jsonnetPath = 'sourceSystemPayload';
    
    // Para sistemas genéricos, usar os paths conforme fornecidos
    // Não assumir estrutura específica de nenhum sistema
    pathParts.forEach(part => {
      jsonnetPath += `["${part}"]`;
    });
    
    console.log(`📍 Path Jsonnet gerado: ${fieldPath} -> ${jsonnetPath}`);
    return jsonnetPath;
  }

  // Gerar template Jsonnet inline auto-contido (SEM imports externos)
  private static generateInlineJsonnetTemplate(
    inputPath: string,
    targetVariable: string,
    transformation: TransformationConfig
  ): string {
    const sourceSystemPayloadVar = 'local sourceSystemPayload = std.extVar("sourceSystemPayload");';
    
    // ✅ VERIFICAÇÃO DE SEGURANÇA PARA PATHS NULOS/INDEFINIDOS
    const safeInputPath = inputPath || 'sourceSystemPayload["undefined"]';
    const inputVar = `local inputValue = if std.objectHas(${safeInputPath.split('.')[0] || 'sourceSystemPayload'}, "${safeInputPath.split('.').slice(1).join('"]["')}") then ${safeInputPath} else null;`;
    
    console.log(`🔧 Template Jsonnet gerado para ${targetVariable}:`);
    console.log(`   📍 Input Path: ${safeInputPath}`);
    console.log(`   🧩 Transformation: ${transformation.type}/${transformation.operation || 'default'}`);

    switch (transformation.type) {
      case 'format_document':
        // Remove pontos, hífens e espaços - com verificação de nulo
        return `${sourceSystemPayloadVar} ${inputVar} { ${targetVariable}: if inputValue != null then std.strReplace(std.strReplace(std.strReplace(std.toString(inputValue), ".", ""), "-", ""), " ", "") else "" }`;

      case 'name_split':
        if (transformation.operation === 'split_first_name') {
          return `${sourceSystemPayloadVar} ${inputVar} local parts = if inputValue != null then std.split(std.toString(inputValue), " ") else []; { ${targetVariable}: if std.length(parts) > 0 then parts[0] else "" }`;
        } else if (transformation.operation === 'split_last_name') {
          return `${sourceSystemPayloadVar} ${inputVar} local parts = if inputValue != null then std.split(std.toString(inputValue), " ") else []; { ${targetVariable}: if std.length(parts) > 1 then std.join(" ", parts[1:]) else "" }`;
        }
        break;

      case 'phone_split':
        if (transformation.operation === 'extract_area_code') {
          return `${sourceSystemPayloadVar} ${inputVar} local cleanPhone = if inputValue != null then std.strReplace(std.strReplace(std.toString(inputValue), "+55", ""), " ", "") else ""; { ${targetVariable}: if std.length(cleanPhone) >= 2 then std.substr(cleanPhone, 0, 2) else "" }`;
        } else if (transformation.operation === 'extract_phone_number') {
          return `${sourceSystemPayloadVar} ${inputVar} local cleanPhone = if inputValue != null then std.strReplace(std.strReplace(std.toString(inputValue), "+55", ""), " ", "") else ""; { ${targetVariable}: if std.length(cleanPhone) > 2 then std.substr(cleanPhone, 2, std.length(cleanPhone)) else "" }`;
        }
        break;

      case 'normalize':
        if (transformation.operation === 'upper_case') {
          return `${sourceSystemPayloadVar} ${inputVar} { ${targetVariable}: if inputValue != null then std.asciiUpper(std.toString(inputValue)) else "" }`;
        } else if (transformation.operation === 'lower_case') {
          return `${sourceSystemPayloadVar} ${inputVar} { ${targetVariable}: if inputValue != null then std.asciiLower(std.toString(inputValue)) else "" }`;
        }
        break;

      case 'country_code':
        // Conversão Brasil -> BRA com verificação de nulo
        return `${sourceSystemPayloadVar} ${inputVar} local countryStr = if inputValue != null then std.toString(inputValue) else ""; { ${targetVariable}: if countryStr == "Brasil" then "BRA" else if countryStr == "Brazil" then "BRA" else countryStr }`;

      case 'gender_code':
        // Conversão Male/Female -> M/F com verificação de nulo
        return `${sourceSystemPayloadVar} ${inputVar} local genderStr = if inputValue != null then std.toString(inputValue) else ""; { ${targetVariable}: if genderStr == "Male" then "M" else if genderStr == "Female" then "F" else genderStr }`;

      case 'concat':
        const separator = transformation.parameters?.separator || ' ';
        return `${sourceSystemPayloadVar} ${inputVar} { ${targetVariable}: if inputValue != null then (if std.isArray(inputValue) then std.join("${separator}", inputValue) else std.toString(inputValue)) else "" }`;

      case 'convert':
        if (transformation.operation === 'string_to_number') {
          return `${sourceSystemPayloadVar} ${inputVar} { ${targetVariable}: if inputValue != null then (if std.isString(inputValue) then std.parseJson(inputValue) else inputValue) else 0 }`;
        } else if (transformation.operation === 'number_to_string') {
          return `${sourceSystemPayloadVar} ${inputVar} { ${targetVariable}: if inputValue != null then std.toString(inputValue) else "" }`;
        }
        break;

      default:
        // Transformação identidade (passthrough) com verificação de nulo
        return `${sourceSystemPayloadVar} ${inputVar} { ${targetVariable}: if inputValue != null then inputValue else "" }`;
    }

    // Fallback para transformação identidade
    return `${sourceSystemPayloadVar} ${inputVar} { ${targetVariable}: if inputValue != null then inputValue else "" }`;
  }

  // Gerar template Jsonnet para um tipo específico de transformação
  private static generateJsonnetForTransformationType(
    transformationType: string, 
    mappings: Array<{
      sourceField: { path: string; type: string; name: string };
      targetPath: string;
      transformation?: TransformationConfig;
    }>
  ): string {
    // Template Jsonnet simples que aplica transformações
    const transformationRules = mappings.map(mapping => {
      const transformation = mapping.transformation!;
      const sourcePath = mapping.sourceField.path;
      
      // Escapar caracteres especiais no path
      const escapedTargetPath = mapping.targetPath.replace(/\./g, '_');
      
      // Gerar regra de transformação baseada no tipo
      switch (transformation.type) {
        case 'format_document':
          return `"${escapedTargetPath}": std.strReplace(std.strReplace(sourceSystemPayload.${sourcePath}, ".", ""), "-", "")`;
        
        case 'normalize':
          if (transformation.operation === 'upper_case') {
            return `"${escapedTargetPath}": std.asciiUpper(sourceSystemPayload.${sourcePath})`;
          }
          return `"${escapedTargetPath}": sourceSystemPayload.${sourcePath}`;
          
        case 'phone_split':
          return `"${escapedTargetPath}": std.substr(std.strReplace(sourceSystemPayload.${sourcePath}, "+55", ""), 0, 2)`;
          
        default:
          return `"${escapedTargetPath}": sourceSystemPayload.${sourcePath}`;
      }
    }).filter(rule => rule).join(', ');

    // Template Jsonnet válido sem quebras de linha problemáticas
    return `local sourceSystemPayload = std.extVar('sourceSystemPayload'); { ${transformationRules} }`;
  }

  // Utilitários para manipular objetos por path
  private static getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private static setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // Validar se todos os templates existem (atualizado para refletir sistema hardcoded)
  static validateTemplates(): boolean {
    // Com a mudança para sistema hardcoded, não precisamos validar templates de arquivos
    // Todos os métodos críticos agora são hardcoded e não dependem de arquivos externos
    console.log('📋 Sistema usando implementações hardcoded - validação de templates não necessária');
    return true;
  }
}
