import { Clock, Flame, Truck, CheckCircle } from 'lucide-react';

const STEPS = [
  { key: 'pending', label: 'Menunggu Dapur', Icon: Clock, desc: 'Permintaan diterima' },
  { key: 'cooking', label: 'Sedang Dimasak', Icon: Flame, desc: 'Dapur memproses' },
  { key: 'on_delivery', label: 'Dalam Perjalanan', Icon: Truck, desc: 'Kurir mengantar' },
  { key: 'delivered', label: 'Telah Diterima', Icon: CheckCircle, desc: 'Pengiriman selesai' },
];

const STATUS_INDEX = { pending: 0, cooking: 1, on_delivery: 2, delivered: 3 };

export default function DeliveryTimeline({ status }) {
  const current = STATUS_INDEX[status] ?? 0;

  return (
    <div className="w-full">
      <div className="relative flex justify-between items-start">
        {/* Progress line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 z-0">
          <div
            className="h-full bg-mbg-blue transition-all duration-700 ease-in-out"
            style={{ width: `${(current / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {STEPS.map((step, i) => {
          const isCompleted = i < current;
          const isActive = i === current;
          const Icon = step.Icon;

          return (
            <div key={step.key} className="flex flex-col items-center z-10 flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                  isCompleted
                    ? 'bg-mbg-blue border-mbg-blue text-white shadow-elevated'
                    : isActive
                    ? 'bg-white border-mbg-blue text-mbg-blue shadow-elevated ring-4 ring-mbg-blue/10'
                    : 'bg-white border-slate-200 text-slate-300'
                }`}
              >
                <Icon size={16} strokeWidth={2.5} />
              </div>
              <div className="mt-2 text-center px-1">
                <p className={`text-xs font-semibold leading-tight ${isActive ? 'text-mbg-blue' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
