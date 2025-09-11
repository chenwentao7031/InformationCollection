export const formatNumber = (num: string | number) => {
  if (!num) return '0';
  const number = parseInt(num.toString());
  if (number >= 1000000) {
    return (number / 1000000).toFixed(1) + 'M';
  }
  if (number >= 1000) {
    return (number / 1000).toFixed(1) + 'K';
  }
  return number.toString();
};


export const formatDate = (dateString: string) => {
  if (!dateString) return '未知时间';
  return new Date(dateString).toLocaleDateString('zh-CN');
};