# Contributing to LGM

Thank you for your interest in contributing to LGM! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 20.x LTS
- npm 10.x
- Git

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/bmordue/lgm.git
   cd lgm
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd api
   npm install
   
   # Frontend  
   cd ../client
   npm install
   ```

3. **Run the development environment**
   ```bash
   # Backend (from api directory)
   npm run monitor  # Development server with auto-reload
   
   # Frontend (from client directory)
   npm run dev      # Vite dev server with hot reload
   ```

## Development Workflow

### Running Tests

```bash
# Backend tests
cd api
npm test                    # All tests
RUN_E2E_TESTS=true npm test  # Including E2E tests
npm run build && npm test    # Build then test

# Frontend tests
cd client
npm run test:unit
```

### Code Quality

```bash
# Backend
cd api
npm run build   # TypeScript compilation
npm test        # Run tests with coverage

# Frontend
cd client
npm run lint    # ESLint with auto-fix
npm run type-check  # TypeScript validation
```

### Building for Production

```bash
# Backend
cd api
npm run build
npm start

# Frontend
cd client
npm run build
```

## Code Standards

### TypeScript

- Use TypeScript for all new code
- Prefer interfaces over type aliases for object shapes
- Use enums for fixed sets of values
- Avoid `any` type - use proper typing or `unknown`
- Use modern `as` syntax for type assertions, not `<Type>`

### Error Handling

- Use custom error classes from `api/utils/Errors.ts`:
  - `NotFoundError` - Resource not found (404)
  - `ValidationError` - Input validation failed (400)
  - `GameError` - Game state issues (409)
  - `PlayerError` - Player-related errors (409)
  - `UnauthorizedError` - Auth failures (401)
- Always throw errors, never return `Promise.reject()`
- Provide meaningful error messages with context

### Configuration

- Use `api/config/GameConfig.ts` for all game constants
- Make values configurable via environment variables when appropriate
- Document new configuration options in `CONFIGURATION.md`

### Testing

- Write tests for all new features
- Use test helpers from `api/test/helpers/testHelpers.ts`
- Follow existing test structure and naming conventions
- Test files should end in `.test.ts`
- Aim for meaningful test coverage, not just high percentages

### Commit Messages

Follow conventional commits format:

```
<type>: <description>

[optional body]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat: add fog of war visibility system
fix: prevent duplicate player joins
docs: update configuration guide
refactor: extract magic numbers to config
test: add edge cases for turn processing
```

## Architecture Guidelines

### Service Layer

- Keep services focused on single responsibilities
- Use dependency injection where appropriate
- Avoid circular dependencies
- Place business logic in service layer, not controllers

### Data Flow

```
Client → Controllers → Services → Store
                ↓
              Models
```

- Controllers handle HTTP concerns
- Services contain business logic
- Store provides data persistence
- Models define data structures

### Adding New Features

1. Define models in `api/service/Models.ts`
2. Add business logic to appropriate service
3. Create/update controllers for API endpoints
4. Update OpenAPI spec in `api/spec/api.yml`
5. Add comprehensive tests
6. Update documentation

## Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow code standards
   - Add/update tests
   - Update documentation

3. **Test your changes**
   ```bash
   npm run build && npm test  # Backend
   npm run build && npm run test:unit  # Frontend
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a pull request on GitHub

6. **PR Requirements**
   - All tests must pass
   - Code must build without errors
   - Follow existing code style
   - Include relevant documentation updates

## Project Structure

```
lgm/
├── api/                    # Backend TypeScript API
│   ├── config/            # Configuration
│   ├── controllers/       # API controllers
│   ├── service/           # Business logic
│   │   ├── Models.ts     # Data models
│   │   ├── GameService.ts
│   │   ├── Rules.ts
│   │   └── ...
│   ├── utils/             # Utilities
│   ├── test/              # Tests
│   └── spec/              # OpenAPI specification
├── client/                 # Frontend Vue 3 app
│   └── src/
│       ├── components/
│       ├── stores/        # Pinia state management
│       └── views/
└── docs/                   # Documentation
```

## Questions or Issues?

- Check existing [Issues](https://github.com/bmordue/lgm/issues)
- Review [README.md](README.md) and [CONFIGURATION.md](CONFIGURATION.md)
- Create a new issue for bugs or feature requests

## License

By contributing, you agree that your contributions will be licensed under the project's Unlicense.
