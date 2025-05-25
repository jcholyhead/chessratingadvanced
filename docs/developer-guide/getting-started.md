# Developer Getting Started Guide

Welcome to the Chess Rating Analytics Dashboard development environment! This guide will help you set up your local development environment and start contributing to the project.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

- **Node.js** (v14 or later, v18+ recommended)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify installation: `node --version`
  
- **npm** (v6 or later) or **yarn** (v1.22 or later)
  - npm comes with Node.js
  - Yarn installation: `npm install -g yarn`
  
- **Git** (v2.20 or later)
  - Download from [git-scm.com](https://git-scm.com/)
  - Verify installation: `git --version`

### Recommended Tools

- **VS Code** or your preferred code editor
- **Git GUI client** (GitHub Desktop, SourceTree, etc.)
- **Chrome DevTools** or similar for debugging

## Project Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-username/chess-rating-analytics.git

# Navigate to the project directory
cd chess-rating-analytics
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install
```

This will install all required dependencies including:
- Next.js 13 with App Router
- React and TypeScript
- Tailwind CSS and shadcn/ui components
- SWR for data fetching
- Recharts for visualizations

### 3. Environment Configuration

Create a `.env.local` file in the project root:

```bash
# Copy the example environment file
cp .env.example .env.local
```

Add the following environment variables:

```env
# API Configuration
NEXT_PUBLIC_API_URL=https://rating.englishchess.org.uk/v2/new/api.php
NEXT_PUBLIC_WEBSITE_URL=http://localhost:3000

# Development Configuration (optional)
NODE_ENV=development
```

### 4. Development Server

Start the development server:

```bash
# Using npm
npm run dev

# Or using yarn
yarn dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

### 5. Verify Installation

After starting the development server, verify that:

1. ✅ The application loads without errors
2. ✅ You can search for chess players
3. ✅ Rating charts display correctly
4. ✅ No console errors in browser DevTools

## Development Workflow

### Code Quality Tools

The project includes several code quality tools:

#### ESLint
```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

#### TypeScript Type Checking
```bash
# Check types
npm run type-check
```

#### Prettier (if configured)
```bash
# Format code
npm run format
```

### Git Hooks (Husky)

The project uses Husky for Git hooks:

```bash
# Install Git hooks
npm run prepare
```

This sets up pre-commit hooks that will:
- Run ESLint on staged files
- Check TypeScript types
- Format code with Prettier

### Building for Production

```bash
# Build the application
npm run build

# Start production server
npm run start
```

## Project Structure Overview

Understanding the codebase structure is crucial for effective development:

```
chess-rating-analytics/
├── app/                    # Next.js 13 App Router
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── ChessResultsTable.tsx
│   ├── PlayerRatingChart.tsx
│   └── ...
├── lib/                   # Utility functions
├── docs/                  # Documentation
├── public/               # Static assets
└── ...
```

For detailed information, see [Project Structure](project-structure.md).

## Key Technologies

### Next.js 13 App Router

- **File-based routing**: Pages and layouts are defined by file structure
- **Server components**: Components that render on the server by default
- **API routes**: Backend functionality in `app/api/`

### TypeScript

- **Type safety**: All components and functions are typed
- **Better IDE support**: Enhanced autocomplete and error detection
- **Self-documenting code**: Types serve as inline documentation

### Tailwind CSS

- **Utility-first**: Style components using utility classes
- **Responsive design**: Built-in responsive design utilities
- **Dark mode support**: Easy theme switching

### SWR

- **Data fetching**: Handles API calls with caching
- **Real-time updates**: Automatic revalidation
- **Error handling**: Built-in error states

## Common Development Tasks

### Adding a New Component

1. Create the component file in `components/`
2. Add TypeScript interfaces for props
3. Implement the component with proper typing
4. Add JSDoc comments for documentation
5. Export the component

Example component structure:
```typescript
interface MyComponentProps {
  title: string;
  data: DataType[];
}

/**
 * MyComponent description
 * @param props - Component props
 */
export default function MyComponent({ title, data }: MyComponentProps) {
  // Component implementation
}
```

### Making API Changes

1. Modify or create route files in `app/api/`
2. Update TypeScript interfaces for request/response types
3. Test the API endpoint manually
4. Update any components that use the API

### Styling Components

1. Use Tailwind utility classes for styling
2. Leverage shadcn/ui components where appropriate
3. Ensure responsive design (mobile-first approach)
4. Test in both light and dark modes

## Debugging and Development Tools

### Browser DevTools

- **React DevTools**: Install the browser extension
- **Console logging**: Use `console.log()` for debugging
- **Network tab**: Monitor API calls and responses

### Next.js DevTools

- **Built-in error overlay**: Shows compilation and runtime errors
- **Performance metrics**: Monitor component render times
- **Hot reloading**: Instant updates during development

### SWR DevTools

- **Cache inspection**: View cached API responses
- **Revalidation monitoring**: Track when data updates
- **Error states**: Debug failed API calls

## Testing (Coming Soon)

The project will include comprehensive testing:

- **Unit tests**: Individual component testing
- **Integration tests**: API and data flow testing
- **End-to-end tests**: Full application workflows

For testing information, see [Testing Guide](testing.md).

## Contributing

Before making changes:

1. **Read the contribution guidelines**: [Contributing Guide](contributing.md)
2. **Check existing issues**: Look for related work or discussions
3. **Create a feature branch**: `git checkout -b feature/your-feature-name`
4. **Follow coding standards**: See [Coding Standards](coding-standards.md)

## Troubleshooting

### Common Issues

**Node.js version errors**
```bash
# Check your Node.js version
node --version

# Update to latest LTS version if needed
```

**Dependency conflicts**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Environment variables not loading**
```bash
# Ensure .env.local exists and contains required variables
# Restart the development server after changes
```

**TypeScript errors**
```bash
# Run type checking to see all errors
npm run type-check

# Check if @types packages are installed
npm list @types/react @types/node
```

### Getting Help

- **Documentation**: Check other sections in this documentation
- **GitHub Issues**: Search existing issues or create new ones
- **Code Comments**: Look for inline documentation in the codebase
- **Architecture Guide**: See [../architecture.md](../../architecture.md) for technical details

## Next Steps

Once you have the development environment set up:

1. **Explore the codebase**: Familiarize yourself with the project structure
2. **Read the coding standards**: Understand the project's coding conventions
3. **Try making a small change**: Start with minor improvements or bug fixes
4. **Review the architecture**: Understand how data flows through the application

---

*Need help? Check our [Contributing Guide](contributing.md) or open an issue on GitHub.*

*Last updated: May 2025* 