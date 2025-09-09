const apiBase = process.env.REACT_APP_LEADERBOARD_API || (typeof window !== 'undefined' ? window.LEADERBOARD_API : '') || '';

export default apiBase;


