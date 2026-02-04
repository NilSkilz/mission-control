# Mission Control 🚀

Family task management app built with Next.js and AWS Amplify Gen2.

## Features

- **Chores**: Assign tasks to family members, track completion, approve and pay for chores
- **Meals**: Plan weekly meals for breakfast, lunch, and dinner
- **Shopping List**: Shared family shopping list
- **Earnings**: Track children's earnings from completed paid chores

## Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: AWS Amplify Gen2 (AppSync GraphQL + DynamoDB)
- **Auth**: Simple cookie-based auth with hardcoded passwords (family app)

## Development

### Prerequisites

- Node.js 18+
- AWS account with Amplify configured
- AWS CLI configured with credentials

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the Amplify sandbox (creates local cloud resources):
   ```bash
   npx ampx sandbox
   ```

3. In another terminal, seed the initial users:
   ```bash
   node scripts/seed-users.js
   ```

4. Start the Next.js dev server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:3002

### Login Credentials

| User   | Password    | Role   |
|--------|-------------|--------|
| rob    | family123   | parent |
| aimee  | family123   | parent |
| dexter | dexter1     | child  |
| logan  | logan1      | child  |

## Deployment

This app is designed to deploy on AWS Amplify Hosting:

1. Connect your repository to Amplify Hosting
2. Amplify will automatically:
   - Deploy the Gen2 backend (AppSync + DynamoDB)
   - Build and deploy the Next.js frontend
3. After first deploy, run the seed script locally pointing to production

## Project Structure

```
├── amplify/
│   ├── backend.ts          # Amplify backend definition
│   └── data/
│       └── resource.ts     # Data schema (DynamoDB models)
├── app/
│   ├── api/                # Next.js API routes
│   ├── page.jsx            # Main app page
│   └── ...
├── components/             # React components
├── lib/
│   └── data.js            # Amplify Data client wrapper
└── scripts/
    └── seed-users.js      # User seeding script
```

## Data Models

- **User**: username, displayName, role (parent/child), avatar
- **Chore**: title, assignedTo, paid, amount, done, approved, recurring
- **Meal**: date, mealType, meal, mealId
- **ShoppingItem**: name, quantity, estimatedCost, addedBy, checked
