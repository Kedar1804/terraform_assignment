AWS Infrastructure & Deployment using Terraform
A complete AWS infrastructure provisioned with Terraform, deploying a containerised backend via Amazon ECS on EC2 and a static frontend on Amazon S3 + CloudFront, with a fully automated CI/CD pipeline using GitHub Actions.
---
Table of Contents
Architecture Overview
Services Used
Infrastructure Components
Project Structure
Deployment Steps
Deployment Outputs
Verification
Security Features
CI/CD Workflow
Useful Commands
Future Improvements
---
Architecture Overview
Backend Architecture
```
           Internet
              │
              ▼
  ┌─────────────────────┐
  │ Application Load    │  ← Public Subnets (us-east-1a, us-east-1b)
  │     Balancer        │
  └────────┬────────────┘
           │  port 80
           ▼
  ┌─────────────────────┐
  │    ECS Service      │  ← awsvpc network mode
  └────────┬────────────┘
           │
           ▼
  ┌─────────────────────┐
  │  ECS Tasks on EC2   │  ← Private Subnets (no public IP)
  │  (private subnets)  │
  └─────────────────────┘
           │
           ▼
     NAT Gateway          ← Outbound internet only (ECR image pulls, etc.)
```
Frontend Architecture
```
        User
          │
          ▼
  ┌───────────────┐
  │  CloudFront   │  ← HTTPS only, global CDN
  │     CDN       │
  └──────┬────────┘
         │  OAC signed request
         ▼
  ┌───────────────┐
  │  Private S3   │  ← Block Public Access fully enabled
  │    Bucket     │
  └───────────────┘
```
---
Services Used
AWS Service	Purpose
Terraform	Infrastructure provisioning (IaC)
Amazon VPC	Networking — subnets, routing, isolation
Amazon ECS	Container orchestration
EC2 + ASG	ECS cluster compute instances
Application Load Balancer	HTTP load balancing for backend
NAT Gateway	Outbound internet for private subnets
Amazon S3	Static frontend file hosting
CloudFront	CDN — HTTPS, caching, global delivery
Amazon ECR	Private Docker image registry
GitHub Actions	CI/CD pipeline — build, push, deploy
CloudWatch	Container log collection
---
Infrastructure Components
Section 1 — Private Network Infrastructure
VPC & Networking
Custom VPC with CIDR `10.0.0.0/16`
Public and private subnets across 2 Availability Zones
Internet Gateway attached to the VPC
NAT Gateway deployed in a public subnet with an Elastic IP
Separate route tables for public subnets (→ IGW) and private subnets (→ NAT)
Application Load Balancer
Internet-facing ALB deployed in public subnets
HTTP listener on port 80 forwarding to ECS target group
Target type set to `ip` (required for `awsvpc` network mode)
Health check enabled on `GET /` expecting HTTP 200
Security Groups
Security Group	Inbound Rule	Outbound Rule
`alb-sg`	Port 80 from `0.0.0.0/0` (internet)	All traffic
`ecs-tasks-sg`	Port 80 from `alb-sg` only	All traffic (via NAT)
---
Section 2 — ECS on EC2 Cluster & Backend Service
ECS Cluster & Auto Scaling Group
ECS cluster created with a private EC2 capacity provider
ECS-optimised Amazon Linux 2 AMI used for EC2 instances
Launch template sets `ECS_CLUSTER` in `/etc/ecs/ecs.config` via user data
Auto Scaling Group launches instances in private subnets
Managed scaling enabled — ECS auto-adjusts instance count based on task demand
ECS Task Definition
Network mode: `awsvpc` (each task gets its own ENI and private IP)
Compatible with EC2 launch type
CloudWatch log group: `/ecs/demo-app`
Backend Application
Node.js backend application
Dockerised and pushed to Amazon ECR
Deployed as an ECS Service registered to the ALB target group
Rolling deployment: min 50% healthy, max 200% during updates
---
Section 3 — Frontend Hosting on S3 & CloudFront
S3 Bucket
Fully private — all four Block Public Access settings enabled
Only accessible via CloudFront (enforced by bucket policy)
CloudFront Distribution
Origin Access Control (OAC) configured — signs all requests to S3
HTTPS-only viewer access enforced (HTTP redirects to HTTPS)
Default root object: `index.html`
S3 bucket policy restricts `s3:GetObject` to this distribution's ARN only
---
Project Structure
```
terraform_assignment/
│
├── backend/
│   ├── app.js                   # Node.js backend application
│   ├── Dockerfile               # Container image build instructions
│   └── package.json             # Node.js dependencies
│
├── modules/
│   ├── alb/                     # Application Load Balancer resources
│   ├── ecs/                     # ECS cluster, task definition, service
│   ├── ecr/                     # ECR repository
│   ├── frontend/                # S3 bucket + CloudFront distribution
│   ├── security-groups/         # ALB and ECS security groups
│   └── vpc/                     # VPC, subnets, IGW, NAT, route tables
│
├── screenshots/                 # Deployment evidence
│
├── .github/
│   └── workflows/
│       └── deploy.yml           # GitHub Actions CI/CD pipeline
│
├── main.tf                      # Root module — calls all child modules
├── outputs.tf                   # Terraform output values
├── provider.tf                  # AWS provider configuration
├── terraform.tfvars             # Variable values (no secrets)
└── README.md
```
---
Deployment Steps
Prerequisites
Terraform >= 1.3.0
AWS CLI v2 configured with valid credentials
Docker (required for the CI/CD bonus section)
```bash
aws configure
# Enter: Access Key ID, Secret Access Key, region (e.g. eu-north-1), output format (json)
```
Step 1 — Clone the Repository
```bash
git clone https://github.com/Kedar1804/terraform_assignment.git
cd terraform_assignment
```
Step 2 — Initialise Terraform
Downloads the AWS provider plugin. Run once per machine.
```bash
terraform init
```
Step 3 — Validate Configuration
Checks all `.tf` files for syntax and configuration errors.
```bash
terraform validate
```
Expected output:
```
Success! The configuration is valid.
```
Step 4 — Preview the Plan
Shows every resource that will be created. No changes are made at this step.
```bash
terraform plan
```
Step 5 — Apply (Deploy Everything)
```bash
terraform apply
```
Type `yes` when prompted. Deployment takes approximately 5–10 minutes.
---
Deployment Outputs
After `terraform apply` completes, the following values are printed:
```
alb_dns_name       = "ecs-alb-950145072.eu-north-1.elb.amazonaws.com"
cloudfront_url     = "dcgjba6rv798t.cloudfront.net"
ecr_repository_url = "886492071931.dkr.ecr.eu-north-1.amazonaws.com/backend-repo"
```
To reprint outputs at any time:
```bash
terraform output
```
---
Verification
Backend — via ALB
Open the ALB URL in a browser:
```
http://ecs-alb-950145072.eu-north-1.elb.amazonaws.com
```
A successful response confirms the ECS service is running and the ALB target group is healthy.
Frontend — via CloudFront
Open the CloudFront URL in a browser:
```
https://dcgjba6rv798t.cloudfront.net
```
The static frontend is served over HTTPS from the private S3 bucket via CloudFront.
---
Security Features
Feature	Implementation
Private compute	ECS tasks deployed in private subnets — no public IP
Outbound-only internet	NAT Gateway handles egress; no inbound from internet to EC2
Private S3	Block Public Access fully enabled; direct S3 URLs return 403
Restricted S3 access	Bucket policy allows `s3:GetObject` only from this CloudFront distribution
No stored AWS credentials	Repository contains zero access keys or secrets
OIDC authentication	GitHub Actions uses short-lived tokens via AWS IAM OIDC — no long-lived keys
---
CI/CD Workflow
On every push to the `main` branch, the GitHub Actions pipeline automatically:
```
Push to main
     │
     ▼
1. Configure AWS credentials via OIDC (no stored keys)
     │
     ▼
2. Build Docker image
     │
     ▼
3. Push image to Amazon ECR (tagged with git commit SHA)
     │
     ▼
4. Register new ECS Task Definition revision
     │
     ▼
5. Trigger rolling ECS service update (zero-downtime deploy)
```
GitHub Setup
After `terraform apply`, add one repository secret:
```
GitHub repo → Settings → Secrets and variables → Actions → New repository secret

Name:  AWS_ROLE_ARN
Value: (paste the github_actions_role_arn Terraform output)
```
---
Useful Commands
```bash
# Destroy all infrastructure (stops all AWS charges)
terraform destroy

# Re-print Terraform outputs
terraform output

# Check currently deployed ECS tasks
aws ecs list-tasks --cluster main-cluster

# Tail live container logs
aws logs tail /ecs/demo-app --follow

# Force a new ECS deployment (e.g. after pushing a new image manually)
aws ecs update-service --cluster main-cluster --service demo-app-service --force-new-deployment
```

SCREENSHOTS:

1.TERRAFORM APPLY

![imagealt] (<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/b10b894c-d0c3-45f7-8684-d762cdbc5587" />)

2. VPC

   ![imagealt]()

3.ECS SERVICE ACTIVE


   ![imagealt]()

4.ALB


   ![imagealt]()

5. TARGET GROUP


   ![imagealt](<img width="1918" height="797" alt="image" src="https://github.com/user-attachments/assets/cbc72642-7e5b-41d5-8732-d5afe24bbc0e" />)

6.CI CD


   ![imagealt]()

7.CLOUDFRONT RESPONSE

   ![imagealt]()

8.BACKEND RESPONSE


   ![imagealt]()


Author
Kedar Hippalge  
GitHub: Kedar1804
