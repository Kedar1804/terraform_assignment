output "alb_dns_name" {
  value = module.alb.alb_dns_name
}

output "cloudfront_url" {
  value = module.frontend.cloudfront_url
}
output "ecr_repository_url" {
  value = module.ecr.repository_url
}