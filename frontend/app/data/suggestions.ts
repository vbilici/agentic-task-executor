export const SUGGESTIONS = [
  "Plan me a birthday party for 20 people in my house in Berlin next week",
  "Compare the weather forecast for Tokyo and Paris. I am planning a vacation for 1 week and will decide which city based on the hot weather",
  "Analyze the webpage libratech.ai and for the services they provide, create a comprehensive feature set analysis",
  "Research the top 5 trending AI tools for productivity in 2025 and compare their features",
  "Create a weekly meal plan for a family of 4 with a budget of $150, focusing on healthy recipes",
  "Find the best flight deals from New York to London for a 5-day trip next month",
  "Summarize the latest news about renewable energy developments and their impact on global markets",
  "Plan a road trip from San Francisco to Los Angeles with scenic stops and restaurant recommendations",
  "Research remote work trends and create a list of best practices for managing distributed teams",
  "Analyze my competitors in the e-commerce space and identify gaps I can exploit",
  "Create a fitness plan for beginners wanting to run their first 5K in 8 weeks",
  "Research the best programming languages to learn in 5 for career growth",
  "Plan a sustainable home renovation project with eco-friendly materials and cost estimates",
  "Find scholarship opportunities for international students pursuing computer science degrees",
  "Create a social media content calendar for a small bakery business for one month",
  "Research investment strategies for beginners with $5,000 to start",
  "Plan a team building event for 15 remote employees across different time zones",
  "Analyze customer reviews of my product and identify the top 3 areas for improvement",
  "Create a study plan for passing the AWS Solutions Architect certification in 3 months",
  "Research the best CRM tools for small businesses and compare pricing and features",
];

export function getRandomSuggestions(count: number = 4): string[] {
  const shuffled = [...SUGGESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
