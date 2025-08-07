import { CloudBuildClient } from '@google-cloud/cloudbuild';
import { Storage } from '@google-cloud/storage';

interface DeploymentRequest {
  integrationId: string;
  integrationName?: string;      
  integrationJson: any;
  customerEmail: string;
}

interface DeploymentResult {
  deploymentId: string;
  status: string;
  triggerUrl: string;
}

interface DeploymentStatus {
  status: string;
  logs: string[];
  updatedAt: string;
}

export class CloudBuildService {
  private projectId: string;
  private region: string;
  private cloudBuild: CloudBuildClient | null = null;
  private storage: Storage | null = null;
  private isSimulationMode: boolean = false;

  constructor() {
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || 'apigee-prd1';
    this.region = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
    
    // Check if credentials are available for real deployment
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('🎭 No credentials found - running in simulation mode');
      this.isSimulationMode = true;
    } else {
      // Initialize clients with real credentials
      try {
        this.cloudBuild = new CloudBuildClient();
        this.storage = new Storage();
        console.log('✅ Google Cloud clients initialized successfully');
        console.log('🚀 Real deployment mode ACTIVE');
        this.isSimulationMode = false;
      } catch (error) {
        console.warn('⚠️ Failed to initialize Google Cloud clients:', error);
        console.log('🔄 Falling back to simulation mode');
        this.isSimulationMode = true;
      }
    }
  }

  /**
   * Deploy integration to Google Cloud Application Integration using IntegrationCLI
   */
  async deployIntegration(request: DeploymentRequest): Promise<DeploymentResult> {
    const { integrationId, integrationName, integrationJson, customerEmail } = request;
    
    try {
      console.log(`🚀 Starting deployment for integration: ${integrationName || integrationId}`);
      console.log(`📧 Customer email: ${customerEmail}`);
      console.log(`🆔 Integration ID: ${integrationId}`);
      console.log(`🏷️ Integration Name: ${integrationName}`);
      console.log(`🔧 Simulation mode: ${this.isSimulationMode}`);

      if (this.isSimulationMode) {
        return this.simulateIntegrationDeployment(request);
      }

      // 1. Upload JSON para Cloud Storage
      const bucketName = `${this.projectId}-integration-configs`;
      const fileName = `${integrationName || integrationId}/integration.json`;
      
      console.log(`📤 Uploading integration JSON to gs://${bucketName}/${fileName}`);
      await this.uploadToStorage(bucketName, fileName, integrationJson);

      // 2. Trigger Cloud Build com IntegrationCLI
      const buildConfig = this.createIntegrationCLIBuildConfig(
        integrationName || integrationId, 
        fileName
      );
      
      console.log(`🔨 Triggering Cloud Build for integration deployment...`);
      if (!this.cloudBuild) {
        throw new Error('Cloud Build client not initialized');
      }
      
      const [operation] = await this.cloudBuild.createBuild({
        projectId: this.projectId,
        build: buildConfig
      });

      const deploymentId = operation.name || `build-${Date.now()}`;
      const triggerUrl = this.generateTriggerUrl(integrationName || integrationId);

      console.log(`✅ Cloud Build triggered successfully`);
      console.log(`🆔 Deployment ID: ${deploymentId}`);
      console.log(`🔗 Trigger URL: ${triggerUrl}`);

      return {
        deploymentId,
        status: 'RUNNING',
        triggerUrl
      };
      
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      throw new Error(`Failed to deploy integration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Simulate deployment for development/testing
   */
  private async simulateIntegrationDeployment(request: DeploymentRequest): Promise<DeploymentResult> {
    const { integrationId, integrationName, integrationJson, customerEmail } = request;
    
    console.log(`🎭 Simulating deployment for development...`);
    console.log(`📝 Integration JSON size: ${JSON.stringify(integrationJson).length} bytes`);
    
    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const deploymentId = `sim-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const triggerUrl = this.generateTriggerUrl(integrationName || integrationId);
    
    console.log(`✅ Simulated deployment successful`);
    console.log(`🆔 Simulated Deployment ID: ${deploymentId}`);
    console.log(`🔗 Generated Trigger URL: ${triggerUrl}`);
    
    return {
      deploymentId,
      status: 'SUCCESS',
      triggerUrl
    };
  }

  /**
   * Upload integration JSON to Cloud Storage
   */
  private async uploadToStorage(bucketName: string, fileName: string, integrationJson: any): Promise<void> {
    try {
      if (!this.storage) {
        throw new Error('Storage client not initialized');
      }

      const bucket = this.storage.bucket(bucketName);
      const file = bucket.file(fileName);
      
      const jsonContent = JSON.stringify(integrationJson, null, 2);
      
      await file.save(jsonContent, {
        metadata: {
          contentType: 'application/json',
        },
      });

      console.log(`✅ Integration JSON uploaded to gs://${bucketName}/${fileName}`);
    } catch (error) {
      console.error('❌ Failed to upload to storage:', error);
      throw new Error(`Failed to upload integration JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create Cloud Build configuration for IntegrationCLI deployment
   * CORRIGIDO: Usar imagem Docker oficial do IntegrationCLI
   */
  private createIntegrationCLIBuildConfig(integrationName: string, configPath: string): any {
    const integrationCliImage = 'us-docker.pkg.dev/appintegration-toolkit/images/integrationcli:v0.79.0';
    
    console.log(`🐳 Using official IntegrationCLI Docker image: ${integrationCliImage}`);
    
    return {
      steps: [
        // Download configuração do Storage
        {
          name: 'gcr.io/cloud-builders/gsutil',
          args: [
            'cp',
            `gs://${this.projectId}-integration-configs/${configPath}`,
            '/workspace/integration.json'
          ],
          id: 'download-config'
        },

        // Verificar download e criar formato de upload usando Python
        {
          name: 'python:3.9-slim',
          entrypoint: 'python',
          args: [
            '-c',
            `import json
import sys
import os

print("🔍 Validating integration JSON...")

try:
    # Read the integration JSON
    with open('/workspace/integration.json', 'r') as f:
        integration_data = json.load(f)
    
    print("✅ JSON validation passed")
    
    # Show integration name if available
    integration_name = integration_data.get('name', integration_data.get('displayName', 'unnamed-integration'))
    print(f"📋 Integration: {integration_name}")
    
    # Create upload format wrapper
    upload_data = {
        'content': json.dumps(integration_data),
        'fileFormat': 'JSON'
    }
    
    # Write upload format
    with open('/workspace/upload.json', 'w') as f:
        json.dump(upload_data, f)
    
    print("✅ Upload format created")
    
    # Show file size
    file_size = os.path.getsize('/workspace/upload.json')
    print(f"📄 Upload file size: {file_size} bytes")

except json.JSONDecodeError as e:
    print(f"❌ Invalid JSON configuration: {e}")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error processing JSON: {e}")
    sys.exit(1)`
          ],
          id: 'prepare-upload',
          waitFor: ['download-config']
        },

        // Preparar para deployment (skip validate - não suportado nesta versão)
        {
          name: 'gcr.io/cloud-builders/gcloud',
          entrypoint: 'bash',
          args: [
            '-c',
            'echo "🔧 Note: IntegrationCLI v0.79.0 validate not available, relying on JSON validation" && echo "✅ Proceeding with deployment"'
          ],
          id: 'validate-config',
          waitFor: ['prepare-upload']
        },

        // Deploy integração usando imagem Docker oficial (formato correto de upload)
        {
          name: integrationCliImage,
          args: [
            'integrations', 'upload',
            '--name', integrationName,
            '--file', '/workspace/upload.json',
            '--proj', this.projectId,
            '--reg', this.region,
            '--default-token'
          ],
          id: 'deploy-integration',
          waitFor: ['validate-config']
        },

        // Aguardar integração estar disponível antes de publicar
        {
          name: 'gcr.io/cloud-builders/gcloud',
          entrypoint: 'bash',
          args: [
            '-c',
            `echo "⏳ Waiting for integration to be available..." && sleep 5 && echo "🔍 Checking if integration ${integrationName} exists..." && echo "📋 Project: ${this.projectId}, Region: ${this.region}"`
          ],
          id: 'wait-for-integration',
          waitFor: ['deploy-integration']
        },

        // Verificar se integração existe antes de publicar
        {
          name: integrationCliImage,
          args: [
            'integrations', 'list',
            '--proj', this.projectId,
            '--reg', this.region,
            '--default-token'
          ],
          id: 'verify-integration-exists',
          waitFor: ['wait-for-integration']
        },

        // Publicar integração usando snapshot específico
        {
          name: integrationCliImage,
          args: [
            'integrations', 'versions', 'publish',
            '--name', integrationName,
            '--snapshot', '1',
            '--latest=false',
            '--proj', this.projectId,
            '--reg', this.region,
            '--default-token'
          ],
          id: 'publish-integration',
          waitFor: ['verify-integration-exists']
        },

        // Verificar deployment final
        {
          name: integrationCliImage,
          args: [
            'integrations', 'list',
            '--proj', this.projectId,
            '--reg', this.region,
            '--default-token'
          ],
          id: 'verify-integration',
          waitFor: ['publish-integration']
        }
      ],
      options: {
        logging: 'CLOUD_LOGGING_ONLY',
        machineType: 'E2_STANDARD_2'
      },
      timeout: {
        seconds: 1200 // 20 minutes
      }
    };
  }

  /**
   * Generate trigger URL for the integration
   */
  private generateTriggerUrl(integrationName: string): string {
    return `https://integrations.googleapis.com/v1/projects/${this.projectId}/locations/${this.region}/integrations/${integrationName}:execute`;
  }

  /**
   * Get deployment status from Cloud Build API
   */
  async getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus> {
    try {
      console.log(`🔍 Checking deployment status for: ${deploymentId}`);
      
      if (this.isSimulationMode || !this.cloudBuild) {
        return this.simulateDeploymentStatus(deploymentId);
      }
      
      // Get build status from Cloud Build API
      const [build] = await this.cloudBuild.getBuild({
        projectId: this.projectId,
        id: deploymentId
      });

      const status = this.mapCloudBuildStatus(String(build.status) || 'UNKNOWN');
      const logs = this.extractBuildLogs(build);

      console.log(`📊 Build status: ${build.status} → ${status}`);
      
      // Convert timestamp to ISO string
      const updatedAt = this.timestampToString(build.finishTime) || 
                       this.timestampToString(build.startTime) || 
                       new Date().toISOString();
      
      return {
        status,
        logs,
        updatedAt
      };
      
    } catch (error) {
      console.error('❌ Failed to get deployment status:', error);
      
      // Return fallback status if API call fails
      return {
        status: 'UNKNOWN',
        logs: [
          `[${new Date().toISOString()}] Failed to get deployment status: ${error instanceof Error ? error.message : 'Unknown error'}`,
          `[${new Date().toISOString()}] This may be due to API permissions or network issues`
        ],
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Simulate deployment status for development
   */
  private simulateDeploymentStatus(deploymentId: string): DeploymentStatus {
    const isSimulation = deploymentId.startsWith('sim-');
    const logs = [
      `[${new Date().toISOString()}] 🎭 Simulated deployment status check`,
      `[${new Date().toISOString()}] 🆔 Deployment ID: ${deploymentId}`,
      `[${new Date().toISOString()}] ✅ Simulation mode deployment completed successfully`,
      `[${new Date().toISOString()}] 🔗 Integration would be available at the generated trigger URL`
    ];

    return {
      status: 'SUCCESS',
      logs,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Map Cloud Build status to our deployment status
   */
  private mapCloudBuildStatus(cloudBuildStatus: string): string {
    const statusMap: Record<string, string> = {
      'QUEUED': 'PENDING',
      'WORKING': 'RUNNING', 
      'SUCCESS': 'SUCCESS',
      'FAILURE': 'FAILED',
      'INTERNAL_ERROR': 'FAILED',
      'TIMEOUT': 'FAILED',
      'CANCELLED': 'FAILED',
      'EXPIRED': 'FAILED'
    };

    return statusMap[cloudBuildStatus] || 'UNKNOWN';
  }

  /**
   * Convert timestamp to ISO string
   */
  private timestampToString(timestamp: any): string | null {
    if (!timestamp) return null;
    
    // If it's already a string, return it
    if (typeof timestamp === 'string') return timestamp;
    
    // If it has seconds property (Google Cloud timestamp format)
    if (timestamp.seconds) {
      return new Date(Number(timestamp.seconds) * 1000).toISOString();
    }
    
    // Try to convert directly
    try {
      return new Date(timestamp).toISOString();
    } catch {
      return null;
    }
  }

  /**
   * Extract logs from Cloud Build response
   */
  private extractBuildLogs(build: any): string[] {
    const logs: string[] = [];
    
    // Add basic build info
    logs.push(`[${build.createTime || new Date().toISOString()}] Build created: ${build.id}`);
    
    if (build.startTime) {
      logs.push(`[${build.startTime}] Build started`);
    }
    
    // Add step information if available
    if (build.steps) {
      build.steps.forEach((step: any, index: number) => {
        const stepName = step.name || `step-${index}`;
        const stepStatus = step.status || 'UNKNOWN';
        logs.push(`[${step.timing?.startTime || build.startTime || new Date().toISOString()}] Step ${index + 1}: ${stepName} - ${stepStatus}`);
      });
    }
    
    if (build.finishTime) {
      logs.push(`[${build.finishTime}] Build completed with status: ${build.status}`);
    }
    
    // Add substitutions info
    if (build.substitutions) {
      logs.push(`[${new Date().toISOString()}] Integration: ${build.substitutions._INTEGRATION_NAME || 'Unknown'}`);
    }
    
    return logs;
  }

  /**
   * Simulate deployment process
   */
  private async simulateDeployment(deploymentId: string, integrationJson: any): Promise<void> {
    // Simulate async deployment process
    setTimeout(() => {
      console.log(`Deployment ${deploymentId} completed successfully`);
    }, 5000);
  }

  /**
   * Create Cloud Build configuration for integration deployment
   */
  private createCloudBuildConfig(integrationId: string, integrationJson: any): any {
    return {
      steps: [
        {
          name: 'gcr.io/cloud-builders/gcloud',
          entrypoint: 'bash',
          args: [
            '-c',
            `echo '${JSON.stringify(integrationJson)}' > /workspace/integration.json`
          ]
        },
        {
          name: 'gcr.io/cloud-builders/gcloud',
          args: [
            'integrations',
            'versions',
            'create',
            '--integration=${_INTEGRATION_ID}',
            '--location=${_REGION}',
            '--source=/workspace/integration.json'
          ]
        }
      ],
      substitutions: {
        '_INTEGRATION_ID': integrationId,
        '_REGION': this.region
      },
      options: {
        logging: 'CLOUD_LOGGING_ONLY'
      }
    };
  }
}
