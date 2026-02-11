#!/bin/bash
# Database Migration Script for tej-india India

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}tej-india Database Migration Tool${NC}"
echo -e "${GREEN}========================================${NC}"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    exit 1
fi

# Function to run migrations
run_migrations() {
    echo -e "${YELLOW}Running database migrations...${NC}"
    npx prisma migrate deploy
    echo -e "${GREEN}✓ Migrations completed successfully${NC}"
}

# Function to generate Prisma Client
generate_client() {
    echo -e "${YELLOW}Generating Prisma Client...${NC}"
    npx prisma generate
    echo -e "${GREEN}✓ Prisma Client generated successfully${NC}"
}

# Function to create a new migration
create_migration() {
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Migration name is required${NC}"
        echo "Usage: ./migrate.sh create <migration-name>"
        exit 1
    fi

    echo -e "${YELLOW}Creating new migration: $1${NC}"
    npx prisma migrate dev --name "$1"
    echo -e "${GREEN}✓ Migration created successfully${NC}"
}

# Function to reset database (DANGEROUS!)
reset_database() {
    echo -e "${RED}WARNING: This will delete all data in the database!${NC}"
    read -p "Are you sure? (type 'yes' to confirm): " confirm

    if [ "$confirm" != "yes" ]; then
        echo -e "${YELLOW}Database reset cancelled${NC}"
        exit 0
    fi

    echo -e "${YELLOW}Resetting database...${NC}"
    npx prisma migrate reset --force
    echo -e "${GREEN}✓ Database reset completed${NC}"
}

# Function to check migration status
check_status() {
    echo -e "${YELLOW}Checking migration status...${NC}"
    npx prisma migrate status
}

# Function to seed database
seed_database() {
    echo -e "${YELLOW}Seeding database...${NC}"
    npx prisma db seed
    echo -e "${GREEN}✓ Database seeded successfully${NC}"
}

# Main script
case "$1" in
    deploy)
        run_migrations
        generate_client
        ;;
    create)
        create_migration "$2"
        ;;
    reset)
        reset_database
        ;;
    status)
        check_status
        ;;
    seed)
        seed_database
        ;;
    generate)
        generate_client
        ;;
    *)
        echo "Usage: $0 {deploy|create|reset|status|seed|generate}"
        echo ""
        echo "Commands:"
        echo "  deploy   - Run pending migrations (production-safe)"
        echo "  create   - Create a new migration (requires name)"
        echo "  reset    - Reset database (DANGEROUS - deletes all data)"
        echo "  status   - Check migration status"
        echo "  seed     - Seed database with initial data"
        echo "  generate - Generate Prisma Client"
        exit 1
        ;;
esac

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Operation completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
