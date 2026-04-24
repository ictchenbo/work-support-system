// 获取当前ISO周日标识，格式为 YYYY-Www
export function getCurrentWeek() {
  const now = new Date();
  const year = now.getFullYear();
  const week = getISOWeek(now);
  return `${year}-W${padZero(week)}`;
}

// 获取ISO周日
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return week;
}

function padZero(num) {
  return num < 10 ? `0${num}` : num;
}

// 解析周标识为年份和周数
export function parseWeek(weekStr) {
  const [year, w] = weekStr.split('-W');
  return {
    year: parseInt(year),
    week: parseInt(w)
  };
}

// 转换为中文描述
export function formatWeekChinese(weekStr) {
  const { year, week } = parseWeek(weekStr);
  return `${year}年第${week}周`;
}

// 获取周的日期范围，返回 { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }
export function getWeekDateRange(weekStr) {
  const { year, week } = parseWeek(weekStr);

  // 计算该周第一天（周一）
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const firstMonday = new Date(januaryFourth);
  firstMonday.setUTCDate(januaryFourth.getUTCDate() - (januaryFourth.getUTCDay() || 7) + 1);

  // 计算当前周第一天
  const start = new Date(firstMonday);
  start.setUTCDate(firstMonday.getUTCDate() + (week - 1) * 7);

  // 计算当前周最后一天（周日）
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  const formatDate = (d) => {
    const year = d.getUTCFullYear();
    const month = padZero(d.getUTCMonth() + 1);
    const day = padZero(d.getUTCDate());
    return `${year}-${month}-${day}`;
  };

  return {
    start: formatDate(start),
    end: formatDate(end)
  };
}
