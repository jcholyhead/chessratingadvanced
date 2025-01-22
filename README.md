# Chess Rating Analytics Dashboard

## Overview

Chess Rating Analytics Dashboard is a comprehensive web application designed to provide enhanced analytics and visualizations for English Chess Federation (ECF) rating data. This project allows chess players, coaches, and enthusiasts to gain deeper insights into rating performance and trends.

## Features

- **Player Search**: Easily search for any ECF-rated player using their name or ECF code.
- **Rating Charts**: Visualize rating changes over time for Standard, Rapid, and Blitz game types.
- **Performance Analysis**: Calculate performance ratings based on recent games, with customizable game count.
- **Common Opponents**: View statistics for most frequently played opponents, including win/loss/draw ratios.
- **Event-based Analysis**: Group games by events and view performance in each event, with expandable details.
- **Time Range Filtering**: Filter rating data and statistics based on different time ranges (3 months, 6 months, 1 year, 2 years, all-time).
- **Responsive Design**: Optimized for both desktop and mobile viewing.

## Technology Stack

- **Frontend**: React with Next.js 13 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Data Fetching**: SWR
- **Charts**: Recharts

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later) or yarn (v1.22 or later)
- Git

## Installation

1. Clone the repository:
   \`\`\`
   git clone https://github.com/your-username/chess-rating-analytics.git
   \`\`\`

2. Navigate to the project directory:
   \`\`\`
   cd chess-rating-analytics
   \`\`\`

3. Install dependencies:
   \`\`\`
   npm install
   \`\`\`
   or if you're using yarn:
   \`\`\`
   yarn install
   \`\`\`

4. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add the following variables:
     \`\`\`
     NEXT_PUBLIC_API_URL=https://rating.englishchess.org.uk/v2/new/api.php
     NEXT_PUBLIC_WEBSITE_URL=http://localhost:3000
     \`\`\`
   - Adjust the values as needed for your development environment

5. (Optional) Install Husky hooks:
   \`\`\`
   npm run prepare
   \`\`\`
   or
   \`\`\`
   yarn prepare
   \`\`\`
   This sets up Git hooks to run linting and formatting before commits.

6. Build the project:
   \`\`\`
   npm run build
   \`\`\`
   or
   \`\`\`
   yarn build
   \`\`\`

7. Start the development server:
   \`\`\`
   npm run dev
   \`\`\`
   or
   \`\`\`
   yarn dev
   \`\`\`

8. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### Verifying the Installation

After completing the installation steps, you should:

1. See the application running without errors in your browser
2. Be able to search for chess players
3. View rating charts and performance analytics

### Troubleshooting Common Issues

If you encounter any issues during installation or running the application, try the following:

1. **Node.js version mismatch**: Ensure you're using a compatible Node.js version (v14 or later). You can check your version with `node --version`.

2. **Dependency issues**: If you encounter errors related to missing dependencies, try deleting the `node_modules` folder and `package-lock.json` (or `yarn.lock`), then run `npm install` (or `yarn install`) again.

3. **Environment variables not loading**: Double-check that your `.env.local` file is in the root directory and contains the correct variables. Restart the development server after making changes.

4. **Build errors**: If you encounter build errors, check the console output for specific error messages. Common issues include syntax errors or missing imports in your code.

5. **API connection issues**: Ensure that the `NEXT_PUBLIC_API_URL` in your `.env.local` file is correct and that you have an active internet connection.

If you continue to experience issues, please check the project's GitHub Issues page or create a new issue with details about the problem you're encountering.

### Updating the Project

To update the project to the latest version:

1. Pull the latest changes from the repository:
   \`\`\`
   git pull origin main
   \`\`\`

2. Install any new dependencies:
   \`\`\`
   npm install
   \`\`\`
   or
   \`\`\`
   yarn install
   \`\`\`

3. Rebuild the project:
   \`\`\`
   npm run build
   \`\`\`
   or
   \`\`\`
   yarn build
   \`\`\`

4. Restart the development server.

Remember to check the project's changelog or release notes for any breaking changes or new features that might require additional setup or code modifications.

