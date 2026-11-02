import AwsSecurityMatrix from '../components/AwsSecurityMatrix';
import '../aws.css';

export default function AwsSecurity() {
  return (
    <div className="aws-container">
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>
          Seguridad e IAM
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
          Comprende los límites de responsabilidad entre AWS y el cliente, gestión de identidades IAM y controles de seguridad.
        </p>
      </div>

      <AwsSecurityMatrix />
    </div>
  );
}
