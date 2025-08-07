#!/bin/bash

# Setup Infrastructure for IntegrationCLI Deployment
# Usage: ./setup-infrastructure.sh [PROJECT_ID] [REGION]

PROJECT_ID=${1:-${GOOGLE_CLOUD_PROJECT_ID:-apigee-prd1}}
REGION=${2:-us-central1}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Validation
if [ -z "$PROJECT_ID" ]; then
    log_error "PROJECT_ID is required. Set GOOGLE_CLOUD_PROJECT_ID environment variable or pass as first argument."
    exit 1
fi

log_info "Setting up infrastructure for IntegrationCLI deployment"
log_info "Project ID: $PROJECT_ID"
log_info "Region: $REGION"

# Set current project
log_info "Setting current project to $PROJECT_ID"
gcloud config set project $PROJECT_ID

# 1. Enable required APIs
log_info "Enabling required Google Cloud APIs..."
gcloud services enable \
    cloudbuild.googleapis.com \
    integrations.googleapis.com \
    storage.googleapis.com \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    --project=$PROJECT_ID

if [ $? -eq 0 ]; then
    log_success "APIs enabled successfully"
else
    log_error "Failed to enable APIs"
    exit 1
fi

# 2. Create Cloud Storage bucket for integration configurations
BUCKET_NAME="$PROJECT_ID-integration-configs"
log_info "Creating Cloud Storage bucket: $BUCKET_NAME"

# Check if bucket already exists
if gsutil ls -b gs://$BUCKET_NAME > /dev/null 2>&1; then
    log_warning "Bucket gs://$BUCKET_NAME already exists"
else
    gsutil mb -p $PROJECT_ID -l $REGION gs://$BUCKET_NAME
    if [ $? -eq 0 ]; then
        log_success "Bucket created successfully"
    else
        log_error "Failed to create bucket"
        exit 1
    fi
fi

# 3. Set bucket permissions for Cloud Build
log_info "Setting bucket permissions for Cloud Build..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
CLOUD_BUILD_SA="$PROJECT_NUMBER@cloudbuild.gserviceaccount.com"

gsutil iam ch serviceAccount:$CLOUD_BUILD_SA:objectAdmin gs://$BUCKET_NAME
log_success "Bucket permissions configured"

# 4. Grant necessary IAM roles to Cloud Build service account
log_info "Granting IAM roles to Cloud Build service account..."

# Integration Admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$CLOUD_BUILD_SA" \
    --role="roles/integrations.integrationAdmin"

# Storage Admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$CLOUD_BUILD_SA" \
    --role="roles/storage.admin"

# Cloud Build Worker role (if not already granted)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$CLOUD_BUILD_SA" \
    --role="roles/cloudbuild.builds.builder"

log_success "IAM roles granted successfully"

# 5. Create a test service account for local development (optional)
SA_NAME="integration-deployer"
SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

log_info "Creating service account for local development: $SA_NAME"

# Check if service account exists
if gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID > /dev/null 2>&1; then
    log_warning "Service account $SA_EMAIL already exists"
else
    gcloud iam service-accounts create $SA_NAME \
        --display-name="Integration Deployer" \
        --description="Service account for local integration deployment" \
        --project=$PROJECT_ID
    
    if [ $? -eq 0 ]; then
        log_success "Service account created"
    else
        log_error "Failed to create service account"
        exit 1
    fi
fi

# Grant roles to the service account
log_info "Granting roles to service account..."

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/integrations.integrationAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/cloudbuild.builds.editor"

log_success "Service account roles granted"

# 6. Download IntegrationCLI for local testing (optional)
log_info "Downloading IntegrationCLI for local testing..."

if command -v integrationcli &> /dev/null; then
    log_warning "IntegrationCLI already installed"
else
    # Create bin directory if it doesn't exist
    mkdir -p ~/bin
    
    # Download and install IntegrationCLI
    curl -L https://github.com/GoogleCloudPlatform/application-integration-management-toolkit/releases/latest/download/integrationcli_linux_x64.tar.gz -o /tmp/integrationcli.tar.gz
    
    cd /tmp
    tar -xzf integrationcli.tar.gz
    chmod +x integrationcli
    
    # Move to user bin (or try /usr/local/bin with sudo)
    if mv integrationcli ~/bin/ 2>/dev/null; then
        log_success "IntegrationCLI installed to ~/bin/"
        log_warning "Add ~/bin to your PATH: export PATH=\$PATH:~/bin"
    elif sudo mv integrationcli /usr/local/bin/ 2>/dev/null; then
        log_success "IntegrationCLI installed to /usr/local/bin/"
    else
        log_warning "Could not install IntegrationCLI to system PATH. Binary available at /tmp/integrationcli"
    fi
    
    # Cleanup
    rm -f /tmp/integrationcli.tar.gz
fi

# 7. Create service account key for local development
KEY_FILE="./integration-deployer-key.json"
if [ ! -f "$KEY_FILE" ]; then
    log_info "Creating service account key for local development..."
    gcloud iam service-accounts keys create $KEY_FILE \
        --iam-account=$SA_EMAIL \
        --project=$PROJECT_ID
    
    if [ $? -eq 0 ]; then
        log_success "Service account key created: $KEY_FILE"
        log_warning "Keep this key secure and add it to .gitignore"
        log_info "Set environment variable: export GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/$KEY_FILE"
    else
        log_error "Failed to create service account key"
    fi
else
    log_warning "Service account key already exists: $KEY_FILE"
fi

# 8. Test IntegrationCLI connection
log_info "Testing IntegrationCLI connection..."

# Set auth for testing
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/$KEY_FILE"

# Test command
if command -v integrationcli &> /dev/null; then
    integrationcli integrations list --project=$PROJECT_ID --location=$REGION --max-results=1 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        log_success "IntegrationCLI connection test successful"
    else
        log_warning "IntegrationCLI connection test failed (may need authentication setup)"
    fi
else
    log_warning "IntegrationCLI not in PATH, skipping connection test"
fi

echo ""
log_success "🎉 Infrastructure setup completed!"
echo ""
log_info "Next steps:"
echo "1. Install backend dependencies: cd backend && npm install"
echo "2. Set environment variables in backend/.env:"
echo "   GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID"
echo "   GOOGLE_CLOUD_REGION=$REGION"
echo "   GOOGLE_APPLICATION_CREDENTIALS=$(pwd)/$KEY_FILE"
echo "3. Test deployment with: npm run dev"
echo ""
log_info "Resources created:"
echo "- Cloud Storage bucket: gs://$BUCKET_NAME"
echo "- Service account: $SA_EMAIL"
echo "- Service account key: $KEY_FILE"
echo "- IAM roles configured for Cloud Build and service account"
echo ""
log_warning "Remember to add $KEY_FILE to .gitignore for security!"
