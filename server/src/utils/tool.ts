// server/src/utils/tool.ts

/**
 * 从文本中提取邮箱地址
 * @param text 可能包含邮箱的文本
 * @returns 提取到的邮箱数组,如果没有则返回空数组
 */
export const extractEmails = (text: string): string[] => {
  // 邮箱正则表达式
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  // 匹配所有邮箱
  const matches = text.match(emailRegex);
  
  // 如果没有匹配到则返回空数组
  return matches ? matches : [];
}

/**
 * 从多个文本中查找所有邮箱,并去重返回
 * @param texts 可能包含邮箱的文本数组
 * @returns 所有不重复的邮箱组成的数组,如果都没有则返回空数组
 */
export const findEmails = (texts: string[]): string[] => {
  // 邮箱正则表达式
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  // 存储所有找到的邮箱
  const allEmails = new Set<string>();
  
  // 遍历文本数组
  for (const text of texts) {
    if (!text) continue;
    
    // 匹配所有邮箱
    const matches = text.match(emailRegex);
    if (matches) {
      matches.forEach(email => allEmails.add(email));
    }
  }

  // 转换Set为数组并返回
  return Array.from(allEmails);
}

/**
 * 从url中提取出channelId
 *  "https://youtube.com/channel/UC1CFuWQyVvXtARiS1rqJOzg" 返回 UC1CFuWQyVvXtARiS1rqJOzg
 */
export const extractChannelId = (url: string): string => {
  const regex2 = /\/channel\/(\w+)/;
  const match2 = url.match(regex2);
  return match2 ? match2[1] : '';
}