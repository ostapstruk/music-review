import { FiCheck, FiShield, FiUser } from 'react-icons/fi';

const ROLE_CONFIG = {
  admin: {
    label: 'Адмін',
    icon: FiShield,
    className: 'role-badge role-badge-admin',
    title: 'Адміністратор платформи',
  },
  artist: {
    label: 'Артист',
    icon: FiCheck,
    className: 'role-badge role-badge-artist',
    title: 'Підтверджений артист',
  },
  listener: {
    label: 'Слухач',
    icon: FiUser,
    className: 'role-badge role-badge-listener',
    title: 'Користувач',
  },
};

export default function RoleBadge({ role, size = 'sm', showLabel = true }) {
  if (!role) return null;
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.listener;
  const Icon = cfg.icon;
  const iconSize = size === 'lg' ? 14 : 11;

  return (
    <span
      className={`${cfg.className} role-badge-${size}`}
      title={cfg.title}
      aria-label={cfg.title}
    >
      <Icon size={iconSize} aria-hidden="true" />
      {showLabel && <span>{cfg.label}</span>}
    </span>
  );
}
