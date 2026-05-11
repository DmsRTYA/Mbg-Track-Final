import { Clock, Flame, Truck, CheckCircle } from 'lucide-react';

const STATUS_CONFIG = {
  pending: {
    label: 'Menunggu Dapur',
    className: 'badge-waiting',
    Icon: Clock,
  },
  cooking: {
    label: 'Sedang Dimasak',
    className: 'badge-cooking',
    Icon: Flame,
  },
  on_delivery: {
    label: 'Dalam Perjalanan',
    className: 'badge-delivery',
    Icon: Truck,
  },
  delivered: {
    label: 'Telah Diterima',
    className: 'badge-done',
    Icon: CheckCircle,
  },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const { Icon, label, className } = config;

  return (
    <span className={className}>
      <Icon size={11} strokeWidth={2.5} />
      {label}
    </span>
  );
}
