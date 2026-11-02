import AwsCostCalculator from '../components/AwsCostCalculator';
import '../aws.css';

export default function AwsCosts() {
  return (
    <div className="aws-container">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1e293b', margin: '0 0 4px' }}>
            Costos y Economía Cloud
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Calcula y modela la estimación de costos mensuales de los servicios en AWS según cargas de trabajo.
          </p>
        </div>
      </div>

      {/* Render Cost Calculator */}
      <AwsCostCalculator />
    </div>
  );
}
