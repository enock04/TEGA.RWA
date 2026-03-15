import clsx from 'clsx';

type Variant = 'green' | 'blue' | 'yellow' | 'red' | 'gray';

const variants: Record<Variant, string> = {
  green:  'bg-green-100 text-green-800',
  blue:   'bg-blue-100 text-blue-800',
  yellow: 'bg-yellow-100 text-yellow-800',
  red:    'bg-red-100 text-red-800',
  gray:   'bg-gray-100 text-gray-700',
};

const statusMap: Record<string, Variant> = {
  confirmed: 'green',
  completed: 'green',
  active:    'blue',
  pending:   'yellow',
  processing:'yellow',
  cancelled: 'red',
  failed:    'red',
  expired:   'gray',
  used:      'gray',
};

interface BadgeProps {
  label: string;
  variant?: Variant;
  status?: string;
}

export default function Badge({ label, variant, status }: BadgeProps) {
  const v = variant ?? (status ? statusMap[status] ?? 'gray' : 'gray');
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variants[v])}>
      {label}
    </span>
  );
}
