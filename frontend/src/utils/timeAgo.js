export default function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  
  if (mins < 1) return 'щойно';
  if (mins < 60) return `${mins} хв тому`;
  
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} год тому`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн тому`;
  
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} тижд тому`;
  }
  
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} міс тому`;
  }
  
  return new Date(dateStr).toLocaleDateString('uk-UA');
}