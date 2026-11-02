/**
 * Mapa de correspondencia entre identificadores de servicios de AWS y los iconos
 * isométricos/vectoriales de FossFLOW (@isoflow/isopacks aws).
 */

export const diagramIconMap: Record<string, string> = {
  // Por ID interno del catálogo
  'srv-ec2': 'aws-ec2',
  'srv-s3': 'aws-simple-storage-service',
  'srv-rds': 'aws-rds',
  'srv-iam': 'aws-identity-and-access-management',
  'srv-vpc': 'aws-networking-content-delivery',
  'srv-route53': 'aws-route-53',
  'srv-cloudfront': 'aws-cloudfront',
  'srv-lambda': 'aws-lambda',
  'srv-cloudwatch': 'aws-cloudwatch',
  'srv-alb': 'aws-elastic-load-balancing',
  'srv-sqs': 'aws-simple-queue-service',
  'srv-sns': 'aws-simple-notification-service',
  'srv-dynamodb': 'aws-database',
  'srv-waf': 'aws-shield',

  // Por código visible / codeName
  'EC2': 'aws-ec2',
  'S3': 'aws-simple-storage-service',
  'RDS': 'aws-rds',
  'IAM': 'aws-identity-and-access-management',
  'VPC': 'aws-networking-content-delivery',
  'Route 53': 'aws-route-53',
  'CloudFront': 'aws-cloudfront',
  'Lambda': 'aws-lambda',
  'CloudWatch': 'aws-cloudwatch',
  'ALB': 'aws-elastic-load-balancing',
  'SQS': 'aws-simple-queue-service',
  'SNS': 'aws-simple-notification-service',
  'DynamoDB': 'aws-database',
  'WAF': 'aws-shield',
};

/**
 * Obtiene el ID del icono para un servicio, con fallback a icono genérico.
 */
export function getServiceIconId(serviceIdOrCode: string): string {
  return diagramIconMap[serviceIdOrCode] || 'aws-cloud';
}
