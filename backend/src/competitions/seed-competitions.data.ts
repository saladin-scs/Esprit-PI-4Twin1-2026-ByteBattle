/* eslint-disable prettier/prettier */

export const SEED_COMPETITIONS = [
  {
    name: '🌟 Supernova Coding Battle #2026',
    description: 'A galaxy-scale competition for the brightest minds. Solve cosmic challenges and win legendary prizes.',
    type: 'algorithmic',
    status: 'active',
    supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
    difficulty: 'hard',
    startTime: new Date(Date.now() - 10 * 60000), // Started 10 minutes ago
    endTime: new Date(Date.now() + 110 * 60000), // Ends in 1h 50m
    rules: 'No cosmic radiation allowed. Pure brain power only.',
    prizes: ['$10,000', 'Space Shuttle', 'Star System'],
    participants: [],
  },
  {
    name: '⚡ Lightning Speed Challenge #1',
    description: 'Complete 5 algorithmic problems in 30 minutes. Test your problem-solving speed and accuracy under time pressure.',
    type: 'speed',
    status: 'active',
    supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
    difficulty: 'medium',
    startTime: new Date(Date.now() - 5 * 60000), // Started 5 minutes ago
    endTime: new Date(Date.now() + 25 * 60000), // Ends in 25 minutes
    rules: 'Fastest correct submission wins. Each wrong submission adds 5 minutes penalty.',
    prizes: ['$500', '$300', '$100'],
    participants: [],
  },
  {
    name: '🏌️ Code Golf Tournament - Fibonacci',
    description: 'Write the shortest possible Fibonacci generator. Compete by minimizing code length while maintaining correctness.',
    type: 'code_golf',
    status: 'active',
    supportedLanguages: ['javascript', 'python', 'java'],
    difficulty: 'easy',
    startTime: new Date(Date.now() - 2 * 60000),
    endTime: new Date(Date.now() + 58 * 60000),
    rules: 'Score based on code length (bytes). Shorter is better. Must pass all test cases.',
    prizes: ['$250', '$150'],
    participants: [],
  },
  {
    name: '🧠 Algorithmic Thinking Marathon',
    description: 'Solve 10 advanced algorithmic problems covering graphs, dynamic programming, and greedy algorithms.',
    type: 'algorithmic',
    status: 'active',
    supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
    difficulty: 'hard',
    startTime: new Date(Date.now() - 30 * 60000),
    endTime: new Date(Date.now() + 2 * 3600000 + 30 * 60000), // 2.5 hours from now
    rules: 'Score = (problems solved * 100) + time bonus. Time bonus = max(0, (7200 - time_taken) / 10).',
    prizes: ['$1,000', '$600', '$300'],
    participants: [],
  },
  {
    name: '🚀 Next Level: Advanced Algorithms',
    description: 'Expert-level competition featuring complex problems. Only for experienced competitive programmers.',
    type: 'algorithmic',
    status: 'scheduled',
    supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
    difficulty: 'expert',
    startTime: new Date(Date.now() + 2 * 24 * 3600000), // Starts in 2 days
    endTime: new Date(Date.now() + 2.1 * 24 * 3600000), // Lasts 2.4 hours
    rules: 'Multi-round competition. Top 10 advance to final round.',
    prizes: ['$2,000', '$1,000', '$500'],
    participants: [],
  },
  {
    name: '⏱️ Speed Duel - Array Manipulation',
    description: 'Quick-fire array problems. See how many you can solve in 10 minutes with high accuracy.',
    type: 'speed',
    status: 'closed',
    supportedLanguages: ['javascript', 'python', 'java'],
    difficulty: 'easy',
    startTime: new Date(Date.now() - 24 * 3600000), // Yesterday
    endTime: new Date(Date.now() - 22 * 3600000), // Ended 22 hours ago
    rules: 'Pure speed test. Accuracy matters - wrong submissions incur penalties.',
    prizes: ['$100', '$50'],
    participants: ['user1', 'user2', 'user3'],
  },
  {
    name: '🎯 Code Golf Challenge - Prime Numbers',
    description: 'Generate prime numbers in the shortest code possible. Creativity and golf skills required.',
    type: 'code_golf',
    status: 'scheduled',
    supportedLanguages: ['javascript', 'python'],
    difficulty: 'hard',
    startTime: new Date(Date.now() + 7 * 24 * 3600000), // 1 week from now
    endTime: new Date(Date.now() + 7.08 * 24 * 3600000), // Lasts 2 hours
    rules: 'Minimize byte count. No external libraries. Pre-existing algorithm solutions allowed.',
    prizes: ['$400', '$200'],
    participants: [],
  },
  {
    name: '🏆 Monthly Algorithm Championship',
    description: 'Comprehensive competition with diverse problem categories. Compete for the monthly title.',
    type: 'algorithmic',
    status: 'closed',
    supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
    difficulty: 'hard',
    startTime: new Date(Date.now() - 8 * 24 * 3600000), // 8 days ago
    endTime: new Date(Date.now() - 6 * 24 * 3600000), // Ended 6 days ago
    rules: 'Leaderboard ranked by problems solved, then by time. Bonus points for elegant solutions.',
    prizes: ['$5,000', '$2,500', '$1,250', '$1,000', '$750'],
    participants: ['champion1', 'champion2', 'elite1', 'elite2', 'expert1'],
  },
  {
    name: '⚡ Express Round - String Operations',
    description: 'Bite-sized speed competition focusing on string manipulation and regex patterns.',
    type: 'speed',
    status: 'scheduled',
    supportedLanguages: ['javascript', 'python', 'java'],
    difficulty: 'medium',
    startTime: new Date(Date.now() + 3 * 24 * 3600000), // 3 days from now
    endTime: new Date(Date.now() + 3.042 * 24 * 3600000), // Lasts 1 hour
    rules: 'Complete 8 string challenges. Fastest correct finisher wins.',
    prizes: ['$200', '$100'],
    participants: [],
  },
  {
    name: '🎪 Code Golf Olympics - Multiple Categories',
    description: 'Multi-round golf competition with challenges in different categories. Show your golfing prowess!',
    type: 'code_golf',
    status: 'active',
    supportedLanguages: ['javascript', 'python', 'cpp'],
    difficulty: 'medium',
    startTime: new Date(Date.now() - 10 * 60000), // 10 minutes ago
    endTime: new Date(Date.now() + 110 * 60000), // Lasts 2 hours
    rules: 'Round-robin format. 5 rounds, each 20 minutes. Cumulative score determines winner.',
    prizes: ['$1,000', '$500', '$250'],
    participants: ['golfer1', 'golfer2', 'golfer3'],
  },
  {
    name: '🚀 Optimization Challenge - Performance Battle',
    description: 'Optimize slow algorithms for maximum performance. Memory and speed matter equally.',
    type: 'algorithmic',
    status: 'active',
    supportedLanguages: ['cpp', 'java', 'python'],
    difficulty: 'expert',
    startTime: new Date(Date.now() - 1 * 3600000), // 1 hour ago
    endTime: new Date(Date.now() + 5 * 3600000), // 5 hours remaining
    rules: 'Score = (Test cases passed * 100) - (Time penalty) - (Memory penalty). Lower penalties are better.',
    prizes: ['$3,000', '$1,500', '$800'],
    participants: ['optimizer1', 'optimizer2'],
  },
  {
    name: '💎 Elite Programmer Series - Round 1',
    description: 'Invitation-only competition for top-rated programmers. Showcase your expertise.',
    type: 'algorithmic',
    status: 'archived',
    supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
    difficulty: 'expert',
    startTime: new Date(Date.now() - 30 * 24 * 3600000), // 30 days ago
    endTime: new Date(Date.now() - 28 * 24 * 3600000), // 28 days ago
    rules: 'Invitation-only. 15 participants. Format: qual rounds + finals.',
    prizes: ['$10,000', '$5,000', '$2,500'],
    participants: ['elite1', 'elite2', 'elite3', 'elite4', 'elite5'],
  },
  {
    name: '⏰ Quick Fire - 10 Minute Dash',
    description: 'Can you solve as many easy problems as possible in just 10 minutes? Test your reflexes!',
    type: 'speed',
    status: 'scheduled',
    supportedLanguages: ['javascript', 'python'],
    difficulty: 'easy',
    startTime: new Date(Date.now() + 1 * 24 * 3600000), // Tomorrow
    endTime: new Date(Date.now() + 1.0083 * 24 * 3600000), // Lasts 12 minutes
    rules: 'Simple problems only. Score = problems solved - penalties. No penalty for attempts.',
    prizes: ['$50'],
    participants: [],
  },
  {
    name: '🎯 Code Golf - Data Structure Challenge',
    description: 'Implement data structure operations in the fewest possible bytes. Advanced golf techniques welcome.',
    type: 'code_golf',
    status: 'closed',
    supportedLanguages: ['javascript', 'python', 'java'],
    difficulty: 'hard',
    startTime: new Date(Date.now() - 15 * 24 * 3600000), // 15 days ago
    endTime: new Date(Date.now() - 14 * 24 * 3600000), // 14 days ago
    rules: 'Node/Tree manipulation operations. Score = total bytes across all solutions.',
    prizes: ['$300', '$150', '$75'],
    participants: ['golfer_pro1', 'golfer_pro2', 'golfer_pro3'],
  },
  {
    name: '🔥 Weekly Algorithm Burn - Hard Mode',
    description: 'Intense algorithmic competition with challenging problem set. Weekly recurring event.',
    type: 'algorithmic',
    status: 'active',
    supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
    difficulty: 'hard',
    startTime: new Date(Date.now() - 45 * 60000), // 45 minutes ago
    endTime: new Date(Date.now() + 3 * 3600000 + 15 * 60000), // 3.25 hours from now
    rules: 'Solve 5 hard problems. Scoring: problems solved * 200 + time bonus.',
    prizes: ['$600', '$300', '$150'],
    participants: ['weekly_champ1', 'weekly_champ2'],
  },
  {
    name: '🏅 Beginner\'s Algorithm Academy',
    description: 'Perfect for beginners. Easy to medium problems to build fundamental skills and confidence.',
    type: 'algorithmic',
    status: 'scheduled',
    supportedLanguages: ['javascript', 'python', 'java'],
    difficulty: 'easy',
    startTime: new Date(Date.now() + 5 * 24 * 3600000), // 5 days from now
    endTime: new Date(Date.now() + 5.25 * 24 * 3600000), // Lasts 6 hours
    rules: 'Learning-focused. No time penalties. Hints available for all problems.',
    prizes: ['Certificate of Completion', 'Badge'],
    participants: [],
  },
];
