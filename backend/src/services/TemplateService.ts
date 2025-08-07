import * as fs from 'fs';
import * as path from 'path';
import { TransformationEngine, TransformationConfig } from './TransformationEngine';

export class TemplateService {
  private static templatesPath = path.join(__dirname, '../../../templates');

  // Carregar template de arquivo
  private static loadTemplate(templatePath: string): string {
    try {
      const fullPath = path.join(this.templatesPath, templatePath);
      return fs.readFileSync(fullPath, 'utf-8');
    } catch (error) {
      console.error(`Error loading template ${templatePath}:`, error);
      throw new Error(`Failed to load template: ${templatePath}`);
    }
  }

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
          "key": "gupyPayload",
          "dataType": "JSON_VALUE",
          "defaultValue": {
            "jsonValue": "{\n  \"body\": {\n    \"companyName\": \"Minerva Foods\",\n    \"event\": \"pre-employee.moved\",\n    \"id\": \"49589201-dbb3-46b7-b2d6-4f3ec16ac742\",\n    \"date\": \"2025-07-03T13:22:51.239Z\",\n    \"data\": {\n      \"job\": {\n        \"departmentCode\": \"40000605\",\n        \"roleCode\": \"35251270\",\n        \"branchCode\": null,\n        \"customFields\": [{\n          \"id\": \"583d1add-a920-4044-a570-7121e371cd1c\",\n          \"title\": \"Qual o seu idioma? / ¿Cuál es tu idioma? / What is your language?\",\n          \"value\": {\n            \"0b88a80f-296c-404d-88b9-10246fa099ba\": \"Seleção Externa (apenas candidatos externo)\",\n            \"27545cca-6298-47a2-99d0-04cf34d4f929\": \"AA00010137-CORTES\",\n            \"35329ad7-22c2-427b-9553-01e40ea63c68\": [],\n            \"575e6e7b-4b85-405a-834c-2c8f7f2c1f4a\": \"Escala 6x1 diurno\",\n            \"67134757-f466-4d2f-b920-7a3bb96a543e\": false,\n            \"f1924119-959d-42bd-9d05-60cc255ff3ad\": true,\n            \"583d1add-a920-4044-a570-7121e371cd1c__value\": \"Português\"\n          }\n        }],\n        \"id\": 9282348.0,\n        \"name\": \"VAGA TESTE INTEGRAÇÃO - Auxiliar de Produção\",\n        \"type\": \"vacancy_type_effective\",\n        \"department\": {\n          \"id\": 726936.0,\n          \"code\": \"40000605\",\n          \"name\": \"MIUDOS DIURNO\",\n          \"similarity\": \"operations\"\n        },\n        \"role\": {\n          \"id\": 1304055.0,\n          \"code\": \"35251270\",\n          \"name\": \"35251270 - AUXILIAR PRODUCAO\",\n          \"similarity\": \"auxiliary\"\n        },\n        \"branch\": {\n          \"id\": 1049440.0,\n          \"code\": null,\n          \"name\": \"BARRETOS - 09.104.182/0001-15 > MINERVA FINE FOODS - BARRETOS > COUROS - MINERVA > DIRETORIA PROCESSADOS\"\n        },\n        \"code\": \"77785-9282348\"\n      },\n      \"application\": {\n        \"id\": 5.7448886E8,\n        \"score\": 36.34942587268007,\n        \"partnerName\": \"gupy_public_page\",\n        \"status\": \"hired\",\n        \"tags\": [\"tagHired\"],\n        \"currentStep\": {\n          \"id\": 5.4392498E7,\n          \"name\": \"Contratação\",\n          \"type\": \"final\"\n        },\n        \"preHiringInformation\": {\n        }\n      },\n      \"candidate\": {\n        \"name\": \"Erica\",\n        \"lastName\": \"Brugognolle\",\n        \"email\": \"ericabru@hotmail.com\",\n        \"identificationDocument\": \"26962277806\",\n        \"countryOfOrigin\": \"BR\",\n        \"birthdate\": \"1979-05-31\",\n        \"addressZipCode\": \"01521-000\",\n        \"addressStreet\": \"Rua Cesário Ramalho\",\n        \"addressNumber\": \"237\",\n        \"addressCity\": \"São Paulo\",\n        \"addressState\": \"São Paulo\",\n        \"addressStateShortName\": \"SP\",\n        \"addressCountry\": \"Brasil\",\n        \"addressCountryShortName\": \"BR\",\n        \"mobileNumber\": \"+5511986637567\",\n        \"phoneNumber\": \"+551138050155\",\n        \"schooling\": \"post_graduate\",\n        \"schoolingStatus\": \"complete\",\n        \"disabilities\": false,\n        \"id\": 256080.0,\n        \"gender\": \"Female\"\n      },\n      \"benefitsEnabled\": true,\n      \"benefits\": {\n        \"contracts\": [],\n        \"transportVoucher\": {\n          \"id\": null,\n          \"title\": null,\n          \"type\": null,\n          \"needSignature\": null,\n          \"description\": null,\n          \"termAndCondition\": null,\n          \"allowAdhere\": false,\n          \"reasonForNotWanting\": null,\n          \"modality\": [],\n          \"amountDay\": null,\n          \"itinerary\": null\n        },\n        \"dentalPlan\": {\n          \"id\": 277901.0,\n          \"title\": \"Plano odontológico - Todos cargos\",\n          \"type\": \"mandatory\",\n          \"needSignature\": null,\n          \"description\": \"<p>TESTE</p>\",\n          \"termAndCondition\": null,\n          \"allowAdhere\": true,\n          \"includeDependents\": null,\n          \"dependents\": []\n        },\n        \"healthAssurance\": {\n          \"id\": 277902.0,\n          \"title\": \"Plano de saúde - Analistas e Coordenadores\",\n          \"type\": \"mandatory\",\n          \"needSignature\": null,\n          \"description\": \"<p>TESTE</p>\",\n          \"termAndCondition\": null,\n          \"allowAdhere\": true,\n          \"includeDependents\": null,\n          \"dependents\": []\n        },\n        \"lifeAssurance\": {\n          \"id\": 277900.0,\n          \"title\": \"Seguro de vida - Demais cargos \",\n          \"type\": \"optional\",\n          \"needSignature\": null,\n          \"description\": \"<p>No caso de não haver cônjuge, não preencher o campo: Inclusão do cônjuge.</p>\",\n          \"termAndCondition\": null,\n          \"allowAdhere\": true,\n          \"beneficiaries\": []\n        },\n        \"foodAndMeal\": {\n          \"id\": null,\n          \"title\": null,\n          \"type\": null,\n          \"needSignature\": null,\n          \"description\": null,\n          \"termAndCondition\": null,\n          \"allowAdhere\": false,\n          \"offerOptions\": null,\n          \"observation1\": null,\n          \"observation2\": null\n        },\n        \"other\": []\n      },\n      \"admission\": {\n        \"status\": \"c40c64d6-7890-4608-ae5b-c7ce1711ea9a\",\n        \"admissionDeadline\": \"2025-06-27T03:00:00.000Z\",\n        \"hiringDate\": \"2025-06-30T03:00:00.000Z\",\n        \"documentsTemplate\": {\n          \"id\": 52807.0,\n          \"name\": \"Admissão CLT\"\n        },\n        \"documents\": [{\n          \"id\": 41.0,\n          \"name\": \"Informações pessoais\",\n          \"values\": {\n            \"sexo\": \"Feminino\",\n            \"etnia\": \"Branca\",\n            \"deficiente\": \"Não\",\n            \"dependentes\": [\"Mariana Brugognolle\", \"Malu Brugognolle\"],\n            \"estado-civil\": \"Solteiro(a)\",\n            \"nacionalidade\": \"Brasil\",\n            \"data-de-nascimento\": \"1979-05-31T03:00:00.000Z\",\n            \"uniao-estavel\": \"Não\",\n            \"documento-identificacao\": \"Carteira de Identidade (RG)\"\n          },\n          \"validation\": {\n            \"status\": \"APPROVED\",\n            \"validatedAt\": \"2025-06-20T14:56:20.427Z\",\n            \"isAutomaticallyValidated\": false,\n            \"cannotValidate\": true\n          }\n        }]\n      },\n      \"position\": {\n        \"positionId\": 1156278.0,\n        \"formGroupType\": \"clt\",\n        \"paymentRecurrence\": \"mensalista\",\n        \"customFields\": [{\n          \"id\": \"1608e91d-599f-455f-ac23-41103fabbc9d\",\n          \"title\": \"Autorização de Aprendiz\",\n          \"value\": false,\n          \"isIntegrated\": true\n        }],\n        \"branch\": {\n          \"id\": 1049440.0,\n          \"code\": \"\",\n          \"label\": \"BARRETOS - 09.104.182/0001-15 > MINERVA FINE FOODS - BARRETOS > COUROS - MINERVA > DIRETORIA PROCESSADOS\"\n        },\n        \"department\": {\n          \"id\": 726936.0,\n          \"code\": \"40000605\",\n          \"name\": \"MIUDOS DIURNO\"\n        },\n        \"role\": {\n          \"id\": 1304055.0,\n          \"code\": \"35251270\",\n          \"name\": \"35251270 - AUXILIAR PRODUCAO\"\n        },\n        \"salary\": {\n          \"value\": 3000.0,\n          \"currency\": \"R$\"\n        },\n        \"costCenter\": null,\n        \"workShift\": null\n      },\n      \"source\": \"ats\",\n      \"isDirectInsertion\": false\n    },\n    \"user\": {\n      \"id\": 359236.0,\n      \"name\": \"Maria Eduarda da Silva Joaquim\",\n      \"email\": \"mariaeduarda.joaquim@gupy.com.br\"\n    }\n  }\n}"
          },
          "displayName": "gupyPayload",
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
            "stringValue": "local gupyPayload = std.extVar(\"gupyPayload\"); local systemPayload = std.extVar(\"systemPayload\"); { pubsub_message_string: std.manifestJsonEx(systemPayload, \"    \") }"
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

  // Gerar tarefa de email (versão com template - mantida para compatibilidade)
  private static generateEmailTask(customerEmail: string): any {
    const template = this.loadTemplate('integration/tasks/email-task.json');
    
    const replacements = {
      TASK_ID: "4",
      EMAIL_TO: customerEmail || "customer@example.com",
      EMAIL_SUBJECT: "Integration Error Notification",
      EMAIL_BODY: "There was an error processing your integration. Please check your system.",
      DISPLAY_NAME: "Send Error Email",
      POSITION_X: "620",
      POSITION_Y: "181"
    };

    const result = this.replacePlaceholders(template, replacements);
    return JSON.parse(result);
  }

  // Gerar tarefa de output de sucesso (versão com template - mantida para compatibilidade)
  private static generateSuccessOutputTask(): any {
    const template = this.loadTemplate('integration/tasks/field-mapping-task.json');
    
    const mappingConfig = {
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
    };

    const replacements = {
      TASK_ID: "5",
      MAPPING_CONFIG: JSON.stringify(mappingConfig),
      NEXT_TASKS: JSON.stringify([]),
      DISPLAY_NAME: "Success Output",
      POSITION_X: "146",
      POSITION_Y: "504"
    };

    const result = this.replacePlaceholders(template, replacements);
    return JSON.parse(result);
  }

  // Gerar tarefa JsonnetMapperTask
  static generateJsonnetMapperTask(
    taskId: string,
    jsonnetTemplate: string,
    displayName: string,
    positionX: number,
    positionY: number
  ): any {
    const template = this.loadTemplate('integration/tasks/jsonnet-mapper-task.json');
    
    const replacements = {
      TASK_ID: taskId,
      JSONNET_TEMPLATE: jsonnetTemplate,
      NEXT_TASKS: JSON.stringify([{ "taskId": "1" }]),
      DISPLAY_NAME: displayName,
      POSITION_X: positionX.toString(),
      POSITION_Y: positionY.toString()
    };

    const result = this.replacePlaceholders(template, replacements);
    return JSON.parse(result);
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
    
    // Payload de exemplo da Gupy para aplicar transformações (com wrapper body)
    const gupyExamplePayload = {
      body: {
        companyName: "Minerva Foods",
        event: "pre-employee.moved",
        id: "49589201-dbb3-46b7-b2d6-4f3ec16ac742",
        date: "2025-07-03T13:22:51.239Z",
        data: {
          job: {
            departmentCode: "40000605",
            roleCode: "35251270",
            branchCode: null,
            name: "Developer",
            department: {
              name: "Technology",
              code: "40000605"
            }
          },
          candidate: {
            name: "John",
            lastName: "Doe",
            email: "john.doe177@gmail.com",
            identificationDocument: "123.456.789-00",
            mobileNumber: "+5511999990000",
            addressCity: "São Paulo",
            addressState: "São Paulo",
            addressCountry: "Brasil",
            addressZipCode: "01414-905",
            gender: "Male"
          },
          admission: {
            hiringDate: "2019-06-19T00:00:00.000Z",
            position: {
              salary: { value: 1250.5 }
            }
          }
        }
      }
    };

    for (const mapping of mappings) {
      try {
        // Obter valor do campo fonte
        const sourceValue = this.getValueByPath(gupyExamplePayload, mapping.sourceField.path);
        
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
        const varName = this.generateVariableName(mapping.sourceField.name);
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
        
        console.log(`✅ Gerada tarefa Jsonnet para ${mapping.sourceField.name}: ${mapping.transformation!.type}`);
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

  // Gerar nome de variável para transformação
  private static generateVariableName(fieldName: string): string {
    const normalizedName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `transformed_mapping_${normalizedName}`;
  }

  // Gerar path Jsonnet
  private static generateJsonnetPath(fieldPath: string): string {
    const pathParts = fieldPath.split('.');
    let jsonnetPath = 'gupyPayload';
    pathParts.forEach(part => {
      jsonnetPath += `["${part}"]`;
    });
    return jsonnetPath;
  }

  // Gerar template Jsonnet inline auto-contido (SEM imports externos)
  private static generateInlineJsonnetTemplate(
    inputPath: string,
    targetVariable: string,
    transformation: TransformationConfig
  ): string {
    const gupyPayloadVar = 'local gupyPayload = std.extVar("gupyPayload");';
    const inputVar = `local inputValue = ${inputPath};`;

    switch (transformation.type) {
      case 'format_document':
        // Remove pontos, hífens e espaços
        return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: std.strReplace(std.strReplace(std.strReplace(inputValue, ".", ""), "-", ""), " ", "") }`;

      case 'name_split':
        if (transformation.operation === 'split_first_name') {
          return `${gupyPayloadVar} ${inputVar} local parts = std.split(inputValue, " "); { ${targetVariable}: if std.length(parts) > 0 then parts[0] else "" }`;
        } else if (transformation.operation === 'split_last_name') {
          return `${gupyPayloadVar} ${inputVar} local parts = std.split(inputValue, " "); { ${targetVariable}: if std.length(parts) > 1 then std.join(" ", parts[1:]) else "" }`;
        }
        break;

      case 'phone_split':
        if (transformation.operation === 'extract_area_code') {
          return `${gupyPayloadVar} ${inputVar} local cleanPhone = std.strReplace(std.strReplace(inputValue, "+55", ""), " ", ""); { ${targetVariable}: std.substr(cleanPhone, 0, 2) }`;
        } else if (transformation.operation === 'extract_phone_number') {
          return `${gupyPayloadVar} ${inputVar} local cleanPhone = std.strReplace(std.strReplace(inputValue, "+55", ""), " ", ""); { ${targetVariable}: std.substr(cleanPhone, 2, std.length(cleanPhone)) }`;
        }
        break;

      case 'normalize':
        if (transformation.operation === 'upper_case') {
          return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: std.asciiUpper(inputValue) }`;
        } else if (transformation.operation === 'lower_case') {
          return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: std.asciiLower(inputValue) }`;
        }
        break;

      case 'country_code':
        // Conversão Brasil -> BRA
        return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: if inputValue == "Brasil" then "BRA" else if inputValue == "Brazil" then "BRA" else inputValue }`;

      case 'gender_code':
        // Conversão Male/Female -> M/F
        return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: if inputValue == "Male" then "M" else if inputValue == "Female" then "F" else inputValue }`;

      case 'concat':
        const separator = transformation.parameters?.separator || ' ';
        return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: std.join("${separator}", if std.isArray(inputValue) then inputValue else [inputValue]) }`;

      case 'convert':
        if (transformation.operation === 'string_to_number') {
          return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: std.parseJson(inputValue) }`;
        } else if (transformation.operation === 'number_to_string') {
          return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: std.toString(inputValue) }`;
        }
        break;

      default:
        // Transformação identidade (passthrough)
        return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: inputValue }`;
    }

    // Fallback para transformação identidade
    return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: inputValue }`;
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
          return `"${escapedTargetPath}": std.strReplace(std.strReplace(gupyPayload.${sourcePath}, ".", ""), "-", "")`;
        
        case 'normalize':
          if (transformation.operation === 'upper_case') {
            return `"${escapedTargetPath}": std.asciiUpper(gupyPayload.${sourcePath})`;
          }
          return `"${escapedTargetPath}": gupyPayload.${sourcePath}`;
          
        case 'phone_split':
          return `"${escapedTargetPath}": std.substr(std.strReplace(gupyPayload.${sourcePath}, "+55", ""), 0, 2)`;
          
        default:
          return `"${escapedTargetPath}": gupyPayload.${sourcePath}`;
      }
    }).filter(rule => rule).join(', ');

    // Template Jsonnet válido sem quebras de linha problemáticas
    return `local gupyPayload = std.extVar('gupyPayload'); { ${transformationRules} }`;
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

  // Validar se todos os templates existem
  static validateTemplates(): boolean {
    const requiredTemplates = [
      'integration/base-integration.json',
      'integration/tasks/field-mapping-task.json',
      'integration/tasks/rest-task.json',
      'integration/tasks/email-task.json',
      'integration/tasks/jsonnet-mapper-task.json',
      'transformations/value-mapping.jsonnet',
      'transformations/date-format.jsonnet',
      'transformations/expression.jsonnet',
      'transformations/conditional.jsonnet'
    ];

    for (const template of requiredTemplates) {
      try {
        this.loadTemplate(template);
      } catch (error) {
        console.error(`Missing template: ${template}`);
        return false;
      }
    }

    return true;
  }
}
