# Apartment Manager

A comprehensive multi-tenant apartment management system designed to streamline property management workflows and enable automated listing syndication to major rental platforms.

## 🏢 Overview

**Apartment Manager** is a modern web application that allows property managers and landlords to manage their apartment buildings, unit types (floorplans), and individual units from a single, unified interface. The system is specifically designed to work within AWS free-tier limits while providing enterprise-grade functionality including automated MITS feed generation for sites like Zillow and Apartments.com.

### Key Features

- **🏗️ Building Management**: Complete property information management including amenities, contact details, policies, and screening criteria
- **📐 Unit Type (Floorplan) Management**: Define unit models with inheritance to simplify unit data entry
- **🏠 Individual Unit Management**: Track availability, pricing, specials, and unit-specific overrides
- **🌐 Multi-Site Syndication**: MITS XML feed generation for automated listing to Zillow, Apartments.com, and other platforms
- **📍 Location Services**: Integrated geocoding and address autocomplete via Radar API
- **📊 Bulk Operations**: Efficient bulk status updates, rent changes, and unit creation
- **🔒 Security & Validation**: Comprehensive input validation and security measures
- **📱 Modern UI/UX**: Responsive design with Alpine.js for interactive components

## 🛠️ Technology Stack

### Frontend
- **[Astro](https://astro.build/)** - Modern static site builder with partial hydration
- **[Alpine.js](https://alpinejs.dev/)** - Lightweight reactive framework for dynamic behavior
- **[Tailwind CSS](https://tailwindcss.com/)** + **[DaisyUI](https://daisyui.com/)** - Utility-first CSS framework with component library
- **[Leaflet](https://leafletjs.com/)** - Interactive maps for location picking

### Backend & Infrastructure
- **[SST (Serverless Stack)](https://sst.dev/)** - Infrastructure as Code framework for AWS
- **[AWS Lambda](https://aws.amazon.com/lambda/)** - Serverless functions (Node.js 22.x on ARM64)
- **[Amazon DynamoDB](https://aws.amazon.com/dynamodb/)** - NoSQL database with provisioned billing for free tier
- **[Amazon S3](https://aws.amazon.com/s3/)** - File storage for images and documents
- **[AWS Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)** - Secure credential management

### Development & Quality
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Bun](https://bun.sh/)** - Fast JavaScript runtime and package manager
- **[ESLint](https://eslint.org/)** - Code linting and formatting
- **[Bun Test](https://bun.sh/docs/cli/test)** - Testing framework (1000+ tests)
- **[Zod](https://zod.dev/)** - Runtime type validation

## 📋 Prerequisites

### System Requirements
- **Node.js**: >= 24.x (specified in engines)
- **Bun**: Latest version (used instead of npm/yarn)
- **AWS CLI**: Configured with appropriate credentials
- **1Password CLI** (optional): For automated AWS credential injection

### AWS Account Setup
The project is optimized for AWS free tier usage:
- DynamoDB tables use provisioned billing (1 RCU/1 WCU)
- Lambda functions use ARM64 architecture for cost efficiency
- S3 and Parameter Store within free tier limits

## 🚀 Installation

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd apartment-manager
bun install
```

### 2. Environment Setup

Create a `.env.op` file for 1Password integration (optional):
```bash
# AWS credentials will be injected via 1Password
# or set them directly in your environment
```

### 3. Deploy Infrastructure

```bash
# Deploy to development environment
bun run sst-dev
```

This will:
- Create all necessary AWS resources
- Set up DynamoDB tables
- Deploy Lambda functions
- Configure API Gateway routes
- Start the local development server

## 🏃‍♂️ Development Setup

### Tmux Monitoring Windows

The project uses standardized tmux windows for continuous monitoring during development:

#### Starting Development Server
```bash
bun run sst-dev
```

#### Monitoring Windows Setup
The following windows should be created for optimal development experience:

1. **sst-dev**: Main development server
2. **tsc-watch**: TypeScript compilation watcher
3. **astro-watch**: Astro type checking
4. **test-watch**: Continuous testing

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `bun run sst-dev` | Main development command | Starts SST dev mode with AWS integration |
| `bun run dev` | `astro dev` | Standalone Astro development (use sst-dev instead) |
| `bun run full-test` | `eslint --fix && tsc && astro check && bun test` | Complete validation pipeline |
| `bun run lint` | `eslint --fix` | Code linting and auto-fixing |
| `bun run sst-diagnostics` | SST diagnostic tools | Debug SST deployment issues |
| `bun run package-check` | Check for package updates | Audit dependencies |

### Development Commands

```bash
# Start development server (CRITICAL: Use this, not 'bun run dev')
bun run sst-dev

# Run all tests
bun test

# Type checking
bun run tsc

# Linting
bun run lint

# Complete validation (run before commits)
bun run full-test
```

## 📁 Project Structure

```
apartment-manager/
├── api/                    # Lambda API endpoints
│   ├── buildings.ts        # Building CRUD operations
│   ├── units.ts           # Unit CRUD and bulk operations
│   ├── unitTypes.ts       # Unit type (floorplan) management
│   ├── feed.ts            # MITS XML feed generation
│   ├── credentials.ts     # Site credential management
│   └── validation/        # API validation schemas
├── astro-src/             # Frontend source code
│   ├── components/        # Astro/Alpine.js components
│   ├── lib/               # Client-side logic and state management
│   ├── pages/            # Application pages
│   └── styles/           # Global styles
├── data/                  # Data layer and DynamoDB integration
│   ├── model.ts          # Database schema definitions
│   ├── buildings.ts      # Building data operations
│   ├── units.ts          # Unit data operations
│   └── unitTypes.ts      # Unit type data operations
├── src/                   # Core business logic
│   ├── mappers/          # Site-specific data mapping (368 tests)
│   ├── mits/             # MITS XML feed generation
│   ├── services/         # External service integrations
│   └── types/            # TypeScript type definitions
├── sst/                   # Infrastructure as Code
│   ├── api.ts            # API Gateway configuration
│   ├── dynamo.ts         # DynamoDB table definitions
│   └── secrets.ts        # Parameter Store setup
└── tests/                # Comprehensive test suite (1000+ tests)
    ├── api/              # API endpoint tests
    ├── astro-src/        # Frontend component tests
    ├── data/             # Data layer tests
    └── src/              # Business logic tests
```

## 🌐 API Documentation

### Core Endpoints

#### Buildings
- `GET /buildings` - List all buildings
- `POST /buildings` - Create new building
- `GET /buildings/{buildingID}` - Get building details
- `PUT /buildings/{buildingID}` - Update building
- `DELETE /buildings/{buildingID}` - Delete building

#### Unit Types (Floorplans)
- `GET /buildings/{buildingID}/unit-types` - List unit types
- `POST /buildings/{buildingID}/unit-types` - Create unit type
- `GET /buildings/{buildingID}/unit-types/{modelID}` - Get unit type
- `PUT /buildings/{buildingID}/unit-types/{modelID}` - Update unit type
- `DELETE /buildings/{buildingID}/unit-types/{modelID}` - Delete unit type

#### Units
- `GET /buildings/{buildingID}/units` - List building units
- `POST /buildings/{buildingID}/units` - Create new unit
- `GET /buildings/{buildingID}/units/{unitID}` - Get unit details
- `PUT /buildings/{buildingID}/units/{unitID}` - Update unit
- `DELETE /buildings/{buildingID}/units/{unitID}` - Delete unit
- `PUT /buildings/{buildingID}/units/bulk-status` - Bulk status updates
- `PUT /buildings/{buildingID}/units/bulk-rent` - Bulk rent updates

#### MITS Feed Integration
- `GET /feed/{site}/live` - Live MITS XML feed for syndication sites

#### Location Services
- `POST /geocoding` - Geocode addresses to coordinates
- `GET /autocomplete/address` - Address autocomplete suggestions

### Authentication
- API endpoints use AWS IAM for authentication in production
- Development mode provides open access for testing

## 🧪 Testing Strategy

The project maintains **1000+ test cases** across **24 test files** with comprehensive coverage:

### Test Categories
- **Unit Tests**: Individual function and component testing
- **Integration Tests**: API endpoint and workflow testing
- **Security Tests**: Input validation and injection prevention (996 lines)
- **Mapper Tests**: Site-specific data transformation (368 tests, 92% coverage)

### Running Tests
```bash
# Run all tests
bun test

# Run specific test file
bun test tests/api/buildings.test.ts

# Run with coverage
bun test --coverage

# Watch mode for development
bun test --watch
```

### Test-Driven Development
The project follows strict TDD principles:
1. Write tests before implementing features
2. Maintain high test coverage (>90%)
3. Use proper test fixtures and mocks
4. Avoid `mock.module()` which causes test pollution

## 🚀 Deployment

### Development Deployment
```bash
# Deploy to development stage
bun run sst-dev
```

### Production Deployment
```bash
# Deploy to production (with protection)
bunx sst deploy --stage production
```

### Infrastructure
- **Regions**: us-west-2 (configurable)
- **Cost Optimization**: Free-tier optimized configuration
- **Protection**: Production resources are protected from deletion
- **Monitoring**: CloudWatch integration for logging and metrics

## 🔐 Security Features

### Input Validation
- **Zod Schema Validation**: Runtime type checking on all inputs
- **SQL Injection Prevention**: Parameterized queries with DynamoDB
- **XSS Protection**: Input sanitization and output encoding
- **XML Injection Prevention**: Specialized validation for MITS feeds

### Authentication & Authorization  
- **AWS IAM Integration**: Role-based access control
- **Parameter Store**: Encrypted credential storage
- **Rate Limiting**: API Gateway throttling
- **CORS Configuration**: Controlled cross-origin requests

### Data Privacy
- **Tenant Isolation**: Proper data segregation in multi-tenant setup
- **No PII Exposure**: Tenant data never transmitted to third parties
- **Audit Logging**: Comprehensive access logging

## 📊 MITS Feed Integration

### Supported Platforms
- **Zillow Rental Manager**: MITS 4.1 XML feeds
- **Apartments.com**: Standard MITS feed integration
- **Extensible Architecture**: Easy to add new platforms

### Feed Features
- **Automated Generation**: Convert internal data to MITS XML
- **Site-Specific Adapters**: Handle platform differences
- **Staging/Publishing**: Review changes before going live
- **Real-time Updates**: Automatic feed updates on data changes

### Integration Process
1. Configure site credentials in Parameter Store
2. Enable feed generation for specific properties
3. Sites crawl the feed endpoints automatically
4. Monitor sync status through the dashboard

## 🗃️ Data Model

### Core Entities
```typescript
Building → UnitType (Floorplan) → Unit
```

### Key Features
- **Inheritance Model**: Units inherit defaults from their UnitType
- **Site-Specific Overrides**: Customize data per syndication platform  
- **Flexible Schema**: Support for diverse property types
- **MITS Compliance**: Native support for industry standard data exchange

### Database Design
- **Single Table Design**: Optimized DynamoDB access patterns
- **Compound Keys**: Efficient querying and relationships
- **Free Tier Optimized**: Minimal RCU/WCU usage

## 🤝 Contributing

### Development Guidelines
1. **Use Bun**: Always use `bun` instead of `npm` (see bunfig.toml)
2. **Follow TypeScript**: Strict type checking, no `@ts-ignore`
3. **Test First**: Write tests before implementing features  
4. **Use Tools**: Leverage MCP tools instead of direct bash commands
5. **Monitor Continuously**: Use tmux windows for real-time feedback

### Code Standards
- **ESLint**: Follow the configured rules strictly
- **Formatting**: 4 spaces for indentation, specific brace styles
- **Security**: Never commit credentials or sensitive data
- **Documentation**: Update README and inline docs for new features

### Pull Request Process
1. Create feature branch from `develop`
2. Write tests for new functionality
3. Ensure all tests pass: `bun run full-test`
4. Submit PR with clear description
5. Address review feedback promptly

## 🐛 Troubleshooting

### Common Issues

#### SST Development Server
```bash
# If SST dev fails to start
bun run sst-diagnostics

# Check AWS credentials
aws sts get-caller-identity

# Reset SST state
rm -rf .sst && bun run sst-dev
```

#### TypeScript Errors
```bash
# Check types without cache
rm -rf node_modules/.cache
bun run tsc --noEmit
```

#### Database Issues
```bash
# Check DynamoDB tables
bunx sst dev --mode=info
```

#### Test Failures
```bash
# Clear test cache and run clean
rm -rf .bun-cache
bun test --clean
```

### Performance Optimization
- Monitor AWS costs in billing dashboard
- Use ARM64 Lambda functions for cost efficiency  
- Optimize DynamoDB queries to minimize RCU usage
- Implement proper caching for external API calls

## 📚 Additional Resources

### Documentation
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Detailed development roadmap
- [AGENTS.md](./AGENTS.md) - Development agent guidelines
- [FLOORPLAN_TESTING_GUIDE.md](./FLOORPLAN_TESTING_GUIDE.md) - Testing procedures

### External APIs
- [Radar API](https://radar.com/) - Geocoding and address autocomplete
- [MITS Standard](https://www.mits-js.org/) - Multi-site listing data exchange
- [SST Documentation](https://sst.dev/docs/) - Infrastructure framework
- [Astro Documentation](https://docs.astro.build/) - Frontend framework

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Craig R. Hughes** - *Primary Developer* - craig.git@rungie.com

See [AUTHORS.md](AUTHORS.md) for additional contributors.

---

**Built with ❤️ using modern web technologies and AWS free tier services.**
