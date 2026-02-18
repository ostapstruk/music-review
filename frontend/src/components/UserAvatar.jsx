const COLORS = [
  '#6c5ce7', '#00b894', '#e17055', '#0984e3',
  '#fdcb6e', '#e84393', '#00cec9', '#d63031',
  '#6c5ce7', '#55efc4', '#fab1a0', '#74b9ff',
];

function getColor(name) {
  if (!name) return COLORS[0];
  const code = name.charCodeAt(0) % COLORS.length;
  return COLORS[code];
}

export default function UserAvatar({ username, size = 32 }) {
  const letter = username ? username[0].toUpperCase() : '?';
  const color = getColor(username);

  return (
    <div
      className="user-avatar"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: size * 0.45,
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}